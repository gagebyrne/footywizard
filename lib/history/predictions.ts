import FplFetch from 'fpl-fetch';
import type { Player } from '@/lib/types/fpl';
import { supabaseAdmin } from '@/lib/supabase/admin';

let fplInstance: InstanceType<typeof FplFetch> | null = null;

function getFpl(): InstanceType<typeof FplFetch> {
  if (!fplInstance) {
    fplInstance = new FplFetch();
  }
  return fplInstance;
}

export function resetFplInstance(): void {
  fplInstance = null;
}

export interface PredictionRecord {
  gameweek: number;
  timestamp: string;
  predictions: PlayerPrediction[];
  totalExpectedPoints: number;
  totalActualPoints?: number;
  formation?: string;
  captain: {
    playerId: number;
    playerName: string;
  };
}

export interface PlayerPrediction {
  playerId: number;
  playerName: string;
  expectedPoints: number;
  actualPoints?: number;
}

interface PredictionRow {
  id: string;
  user_id: string;
  gameweek: number;
  timestamp: string;
  total_expected_points: number;
  total_actual_points: number | null;
  formation: string | null;
  captain_player_id: number;
  captain_player_name: string;
  players: PlayerPrediction[];
}

function rowToRecord(row: PredictionRow): PredictionRecord {
  return {
    gameweek: row.gameweek,
    timestamp: row.timestamp,
    predictions: row.players,
    totalExpectedPoints: row.total_expected_points,
    ...(row.total_actual_points !== null && { totalActualPoints: row.total_actual_points }),
    ...(row.formation && { formation: row.formation }),
    captain: {
      playerId: row.captain_player_id,
      playerName: row.captain_player_name,
    },
  };
}

export async function savePrediction(
  userId: string,
  gameweek: number,
  lineup: Player[],
  captain: Player,
  expectedPoints: number,
  formation?: string
): Promise<void> {
  const startTime = Date.now();

  try {
    const players: PlayerPrediction[] = lineup.map((player) => ({
      playerId: player.id,
      playerName: player.web_name,
      expectedPoints: player.ep_next ? parseFloat(player.ep_next) : 0,
    }));

    const { error } = await supabaseAdmin
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          gameweek,
          timestamp: new Date().toISOString(),
          total_expected_points: expectedPoints,
          formation: formation ?? null,
          captain_player_id: captain.id,
          captain_player_name: captain.web_name,
          players,
        },
        { onConflict: 'user_id,gameweek' }
      );

    if (error) throw new Error(error.message);

    console.log('[Predictions] Saved prediction', {
      gameweek,
      playerCount: lineup.length,
      expectedTotal: expectedPoints.toFixed(2),
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Predictions] Failed to save prediction', {
      gameweek,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function backfillActuals(userId: string): Promise<PredictionRecord[]> {
  const startTime = Date.now();

  try {
    const { data: rows, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('gameweek', { ascending: false });

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const fpl = getFpl();
    const bootstrapData = await fpl.getBootstrapData();
    const finishedGameweeks = new Set(
      bootstrapData.events.filter((e) => e.finished).map((e) => e.id)
    );

    let updatedCount = 0;
    let apiErrors = 0;

    for (const row of rows as PredictionRow[]) {
      if (!finishedGameweeks.has(row.gameweek) || row.total_actual_points !== null) {
        continue;
      }

      let totalActual = 0;
      let playersFetched = 0;
      const updatedPlayers = [...row.players];

      for (const prediction of updatedPlayers) {
        try {
          const playerSummary = await fpl.getPlayer(prediction.playerId);
          const historyEntry = playerSummary.history.find((h) => h.round === row.gameweek);

          if (historyEntry) {
            prediction.actualPoints = historyEntry.total_points;
            totalActual +=
              prediction.playerId === row.captain_player_id
                ? historyEntry.total_points * 2
                : historyEntry.total_points;
            playersFetched++;
          }
        } catch (error) {
          console.error('[Predictions] Failed to fetch player summary', {
            gameweek: row.gameweek,
            playerId: prediction.playerId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          apiErrors++;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('predictions')
        .update({ players: updatedPlayers, total_actual_points: totalActual })
        .eq('id', row.id);

      if (updateError) {
        console.error('[Predictions] Failed to update actuals', {
          gameweek: row.gameweek,
          error: updateError.message,
        });
      } else {
        row.players = updatedPlayers;
        row.total_actual_points = totalActual;
        updatedCount++;

        console.log('[Predictions] Backfilled actuals for gameweek', {
          gameweek: row.gameweek,
          playersFetched,
          apiErrors,
          actualTotal: totalActual.toFixed(2),
        });
      }
    }

    console.log('[Predictions] Backfill complete', {
      updatedGameweeks: updatedCount,
      totalApiErrors: apiErrors,
      durationMs: Date.now() - startTime,
    });

    return (rows as PredictionRow[]).map(rowToRecord);
  } catch (error) {
    console.error('[Predictions] Backfill failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const { data: rows } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('gameweek', { ascending: false });

    return ((rows ?? []) as PredictionRow[]).map(rowToRecord);
  }
}

export async function getPredictions(userId: string): Promise<PredictionRecord[]> {
  return backfillActuals(userId);
}
