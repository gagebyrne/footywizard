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
  fplExpectedPoints?: number;
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
  fpl_expected_points: number | null;
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
    ...(row.fpl_expected_points !== null && { fplExpectedPoints: row.fpl_expected_points }),
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

    const fplExpectedPoints = lineup.reduce(
      (sum, p) => sum + (p.ep_this ? parseFloat(p.ep_this) : 0),
      0
    );

    const { error } = await supabaseAdmin
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          gameweek,
          timestamp: new Date().toISOString(),
          total_expected_points: expectedPoints,
          fpl_expected_points: fplExpectedPoints,
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

export async function getPredictions(userId: string): Promise<PredictionRecord[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('gameweek', { ascending: false });

  if (error) throw new Error(error.message);
  return ((rows ?? []) as PredictionRow[]).map(rowToRecord);
}

export async function backfillActuals(userId: string, gameweek: number): Promise<PredictionRecord> {
  const startTime = Date.now();

  const { data: rows, error } = await supabaseAdmin
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('gameweek', gameweek);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error(`No prediction found for gameweek ${gameweek}`);

  const row = rows[0] as PredictionRow;

  if (row.total_actual_points !== null) return rowToRecord(row);

  const fpl = getFpl();
  const bootstrapData = await fpl.getBootstrapData();
  const event = bootstrapData.events.find((e: { id: number; finished: boolean }) => e.id === gameweek);

  if (!event?.finished) return rowToRecord(row);

  let totalActual = 0;
  let playersFetched = 0;
  let apiErrors = 0;
  const updatedPlayers = [...row.players];

  for (const prediction of updatedPlayers) {
    try {
      const playerSummary = await fpl.getPlayer(prediction.playerId);
      const historyEntry = playerSummary.history.find((h: { round: number; total_points: number }) => h.round === gameweek);

      if (historyEntry) {
        prediction.actualPoints = historyEntry.total_points;
        totalActual +=
          prediction.playerId === row.captain_player_id
            ? historyEntry.total_points * 2
            : historyEntry.total_points;
        playersFetched++;
      }
    } catch (err) {
      console.error('[Predictions] Failed to fetch player summary', {
        gameweek,
        playerId: prediction.playerId,
        error: err instanceof Error ? err.message : 'Unknown error',
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
      gameweek,
      error: updateError.message,
    });
    return rowToRecord(row);
  }

  row.players = updatedPlayers;
  row.total_actual_points = totalActual;

  console.log('[Predictions] Backfilled actuals for gameweek', {
    gameweek,
    playersFetched,
    apiErrors,
    actualTotal: totalActual.toFixed(2),
    durationMs: Date.now() - startTime,
  });

  return rowToRecord(row);
}
