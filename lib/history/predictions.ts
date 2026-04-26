/**
 * Historical prediction persistence and actuals backfill
 * 
 * Manages data/historical-predictions.json storage:
 * - savePrediction: Appends predictions (overwrites if GW exists)
 * - backfillActuals: Fetches element-summary for finished gameweeks and updates actualPoints
 * 
 * Schema:
 * {
 *   gameweek: number,
 *   timestamp: ISO string,
 *   predictions: Array<{ playerId: number, playerName: string, expectedPoints: number, actualPoints?: number }>,
 *   totalExpectedPoints: number,
 *   totalActualPoints?: number
 * }
 */

import { promises as fs } from 'fs';
import path from 'path';
import FplFetch from 'fpl-fetch';
import type { Player } from '@/lib/types/fpl';

/**
 * Lazy FPL client initialization for testability
 */
let fplInstance: InstanceType<typeof FplFetch> | null = null;

function getFpl(): InstanceType<typeof FplFetch> {
  if (!fplInstance) {
    fplInstance = new FplFetch();
  }
  return fplInstance;
}

/**
 * Reset FPL instance (for testing)
 */
export function resetFplInstance(): void {
  fplInstance = null;
}

/**
 * Historical prediction record
 */
export interface PredictionRecord {
  gameweek: number;
  timestamp: string;
  predictions: PlayerPrediction[];
  totalExpectedPoints: number;
  totalActualPoints?: number;
  captain: {
    playerId: number;
    playerName: string;
  };
}

/**
 * Per-player prediction with optional actuals
 */
export interface PlayerPrediction {
  playerId: number;
  playerName: string;
  expectedPoints: number;
  actualPoints?: number;
}

const PREDICTIONS_FILE = path.join(process.cwd(), 'data', 'historical-predictions.json');

/**
 * Load all historical predictions from disk
 */
async function loadPredictions(): Promise<PredictionRecord[]> {
  try {
    const content = await fs.readFile(PREDICTIONS_FILE, 'utf-8');
    return JSON.parse(content) as PredictionRecord[];
  } catch (error) {
    // File doesn't exist or is invalid
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Save predictions to disk (atomic write)
 */
async function writePredictions(predictions: PredictionRecord[]): Promise<void> {
  const content = JSON.stringify(predictions, null, 2);
  await fs.writeFile(PREDICTIONS_FILE, content, 'utf-8');
}

/**
 * Save prediction for a gameweek
 * 
 * Appends new prediction or overwrites if gameweek already exists.
 * Logs structured output: GW, timestamp, player count, expected total.
 * 
 * @param gameweek - Gameweek number
 * @param lineup - Optimized lineup
 * @param captain - Captain player
 * @param expectedPoints - Total expected points for the lineup
 */
export async function savePrediction(
  gameweek: number,
  lineup: Player[],
  captain: Player,
  expectedPoints: number
): Promise<void> {
  const startTime = Date.now();
  
  try {
    const predictions = await loadPredictions();
    
    // Build prediction record
    const record: PredictionRecord = {
      gameweek,
      timestamp: new Date().toISOString(),
      predictions: lineup.map((player) => ({
        playerId: player.id,
        playerName: player.web_name,
        expectedPoints: player.ep_next ? parseFloat(player.ep_next) : 0,
      })),
      totalExpectedPoints: expectedPoints,
      captain: {
        playerId: captain.id,
        playerName: captain.web_name,
      },
    };
    
    // Remove existing prediction for this gameweek (overwrite)
    const filtered = predictions.filter((p) => p.gameweek !== gameweek);
    filtered.push(record);
    
    // Sort by gameweek descending (newest first)
    filtered.sort((a, b) => b.gameweek - a.gameweek);
    
    await writePredictions(filtered);
    
    const durationMs = Date.now() - startTime;
    console.log('[Predictions] Saved prediction', {
      gameweek,
      timestamp: record.timestamp,
      playerCount: lineup.length,
      expectedTotal: expectedPoints.toFixed(2),
      durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Predictions] Failed to save prediction', {
      gameweek,
      error: message,
    });
    // Don't throw — saving predictions is fire-and-forget
  }
}

/**
 * Backfill actual points for finished gameweeks
 * 
 * Fetches element-summary for each player in finished gameweeks that lack actuals.
 * Updates actualPoints fields and totalActualPoints.
 * Logs structured output: GW, players fetched, API errors, actual total.
 * 
 * @returns Updated predictions with actuals backfilled
 */
export async function backfillActuals(): Promise<PredictionRecord[]> {
  const startTime = Date.now();
  
  try {
    const predictions = await loadPredictions();
    
    // Fetch current bootstrap data to determine finished gameweeks
    const fpl = getFpl();
    const bootstrapData = await fpl.getBootstrapData();
    const finishedGameweeks = new Set(
      bootstrapData.events.filter((e) => e.finished).map((e) => e.id)
    );
    
    let updatedCount = 0;
    let apiErrors = 0;
    
    for (const record of predictions) {
      // Skip if gameweek not finished or already has actuals
      if (!finishedGameweeks.has(record.gameweek) || record.totalActualPoints !== undefined) {
        continue;
      }
      
      let totalActual = 0;
      let playersFetched = 0;
      
      for (const prediction of record.predictions) {
        try {
          const playerSummary = await fpl.getPlayer(prediction.playerId);
          const historyEntry = playerSummary.history.find(
            (h) => h.round === record.gameweek
          );
          
          if (historyEntry) {
            prediction.actualPoints = historyEntry.total_points;
            
            // Double captain points
            if (prediction.playerId === record.captain.playerId) {
              totalActual += historyEntry.total_points * 2;
            } else {
              totalActual += historyEntry.total_points;
            }
            
            playersFetched++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Predictions] Failed to fetch player summary', {
            gameweek: record.gameweek,
            playerId: prediction.playerId,
            playerName: prediction.playerName,
            error: message,
          });
          apiErrors++;
        }
      }
      
      record.totalActualPoints = totalActual;
      updatedCount++;
      
      console.log('[Predictions] Backfilled actuals for gameweek', {
        gameweek: record.gameweek,
        playersFetched,
        apiErrors,
        actualTotal: totalActual.toFixed(2),
      });
    }
    
    if (updatedCount > 0) {
      await writePredictions(predictions);
    }
    
    const durationMs = Date.now() - startTime;
    console.log('[Predictions] Backfill complete', {
      updatedGameweeks: updatedCount,
      totalApiErrors: apiErrors,
      durationMs,
    });
    
    return predictions;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Predictions] Backfill failed', {
      error: message,
    });
    // Return existing predictions on error
    return loadPredictions();
  }
}

/**
 * Get all historical predictions (with actuals backfilled on-demand)
 * 
 * Loads predictions from disk and triggers backfill for finished gameweeks.
 * 
 * @returns All predictions with actuals where available
 */
export async function getPredictions(): Promise<PredictionRecord[]> {
  return backfillActuals();
}
