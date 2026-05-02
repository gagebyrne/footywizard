import FplFetch from 'fpl-fetch';
import type { Player, Team, Fixture, Event } from '@/lib/types/fpl';
import type { OptimizeResponse, ConstraintStatus } from '@/lib/types/optimizer';
import { calculateExpectedPoints } from '@/lib/optimizer/expected-points';
import { optimizeAllFormations } from '@/lib/optimizer/ilp-solver';
import { VALID_FORMATIONS } from '@/lib/optimizer/formation-validator';
import { applyPositionOverride } from '@/lib/optimizer/fixture-difficulty';
import { savePrediction } from '@/lib/history/predictions';

export interface OptimizationError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export type OptimizationResult =
  | { ok: true; data: OptimizeResponse }
  | { ok: false; status: number; error: OptimizationError };

const fpl = new FplFetch();

function isViable(player: Player, fixtures: Fixture[]): boolean {
  if (player.status !== 'a') return false;
  return fixtures.some((f) => f.team_h === player.team || f.team_a === player.team);
}

export async function runOptimization(squadPlayerIds?: number[], userId?: string): Promise<OptimizationResult> {
  const requestStartTime = Date.now();
  console.log('[runOptimization] Started', { squadSize: squadPlayerIds?.length });

  try {
    const bootstrapData = await fpl.getBootstrapData();
    const allPlayers: Player[] = bootstrapData.elements;
    const teams: Team[] = bootstrapData.teams;

    const squadIdSet = squadPlayerIds ? new Set(squadPlayerIds) : null;
    const squadPlayers: Player[] = squadIdSet
      ? allPlayers.filter((p) => squadIdSet.has(p.id))
      : allPlayers;

    if (squadIdSet && squadPlayers.length < 11) {
      return {
        ok: false,
        status: 422,
        error: {
          error: 'SQUAD_TOO_SMALL',
          message: 'Squad has fewer than 11 available players in the current FPL data.',
          details: { foundPlayers: squadPlayers.length, requestedIds: squadPlayerIds?.length },
        },
      };
    }

    // Saved-squad mode: budget already locked in at squad-creation time;
    // ignore further price drift. Full-pool mode: enforce £100m.
    const budgetLimit = squadIdSet ? 99999 : 1000;

    const events: Event[] = bootstrapData.events;
    const currentEvent = events.find((e) => e.is_current);
    if (!currentEvent) {
      console.error('[runOptimization] No current gameweek found');
      return {
        ok: false,
        status: 500,
        error: { error: 'NO_CURRENT_GAMEWEEK', message: 'Unable to determine current gameweek' },
      };
    }

    const allFixturesRaw = await fpl.getFixtures();
    const allFixtures = applyPositionOverride(allFixturesRaw, teams);
    const fixtures: Fixture[] = allFixtures.filter((f) => f.event === currentEvent.id);

    // Pre-filter the pool: drop unavailables and players with no fixture this GW.
    // The ILP only sees players that can actually contribute.
    const viablePlayers = squadPlayers.filter((p) => isViable(p, fixtures));

    const expectedPoints = new Map<number, number>();
    for (const player of viablePlayers) {
      expectedPoints.set(player.id, calculateExpectedPoints(player, fixtures, teams));
    }

    const optimizationStartTime = Date.now();
    let result;
    try {
      result = optimizeAllFormations(viablePlayers, expectedPoints, budgetLimit);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('[runOptimization] Validation failure:', message);
      return {
        ok: false,
        status: 500,
        error: {
          error: 'SOLVER_BUG',
          message: 'Lineup validation failed (solver bug)',
          details: { validationError: message },
        },
      };
    }

    const solveTimeMs = Date.now() - optimizationStartTime;

    if (result === null) {
      console.warn('[runOptimization] No viable lineup', {
        solveTimeMs,
        squadSize: squadPlayers.length,
        viableSize: viablePlayers.length,
      });
      return {
        ok: false,
        status: 422,
        error: {
          error: 'NO_VALID_LINEUP',
          message:
            'No viable players in this squad for the current gameweek (all unavailable or no fixtures).',
          details: {
            squadSize: squadPlayers.length,
            viableSize: viablePlayers.length,
            solveTimeMs,
          },
        },
      };
    }

    // Find the formation skeleton that matches the (possibly partial) result.
    // In partial mode we want the formation we actually solved against; the
    // ILP returned that via captain/players, but we re-derive it by matching
    // counts ≤ each formation's caps in priority order (most-filled first).
    const lineupCounts = {
      gk: result.players.filter((p) => p.element_type === 1).length,
      def: result.players.filter((p) => p.element_type === 2).length,
      mid: result.players.filter((p) => p.element_type === 3).length,
      fwd: result.players.filter((p) => p.element_type === 4).length,
    };
    let formationName = 'unknown';
    if (!result.partial) {
      formationName =
        Object.keys(VALID_FORMATIONS).find((name) => {
          const f = VALID_FORMATIONS[name];
          return (
            lineupCounts.gk === f.gk &&
            lineupCounts.def === f.def &&
            lineupCounts.mid === f.mid &&
            lineupCounts.fwd === f.fwd
          );
        }) || 'unknown';
    } else {
      // Pick the formation whose caps cover lineupCounts and has the smallest
      // total empty slots (== smallest formation size − filled). All formations
      // total 11, so this reduces to: any formation whose caps cover the
      // counts. Tiebreak alphabetically for determinism.
      const filled = result.players.length;
      formationName =
        [...Object.keys(VALID_FORMATIONS)].sort().find((name) => {
          const f = VALID_FORMATIONS[name];
          return (
            lineupCounts.gk <= f.gk &&
            lineupCounts.def <= f.def &&
            lineupCounts.mid <= f.mid &&
            lineupCounts.fwd <= f.fwd &&
            filled <= 11
          );
        }) || 'unknown';
    }

    const positionCounts = {
      GK: lineupCounts.gk,
      DEF: lineupCounts.def,
      MID: lineupCounts.mid,
      FWD: lineupCounts.fwd,
    };
    const teamCounts: Record<string, number> = {};
    for (const player of result.players) {
      const teamName =
        teams.find((t) => t.id === player.team)?.short_name || String(player.team);
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
    }

    const constraints: ConstraintStatus = {
      budget: { used: result.totalCost, limit: 1000 },
      positions: positionCounts,
      teamLimits: teamCounts,
    };

    console.log('[runOptimization] Success', {
      formation: formationName,
      partial: result.partial,
      filledSlots: result.players.length,
      totalExpectedPoints: result.totalExpectedPoints.toFixed(2),
      solveTimeMs,
      totalTimeMs: Date.now() - requestStartTime,
    });

    if (result.captain && userId) {
      savePrediction(
        userId,
        currentEvent.id,
        result.players,
        result.captain,
        result.totalExpectedPoints,
        formationName
      ).catch((error) => {
        console.error('[runOptimization] Failed to save prediction', {
          gameweek: currentEvent.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    return {
      ok: true,
      data: {
        lineup: result.players,
        captain: result.captain,
        expectedPoints: result.totalExpectedPoints,
        formation: formationName,
        partial: result.partial,
        constraints,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[runOptimization] Failed', {
      error: message,
      totalTimeMs: Date.now() - requestStartTime,
    });

    if (message.includes('timeout') || message.includes('Timeout')) {
      return {
        ok: false,
        status: 504,
        error: {
          error: 'OPTIMIZATION_TIMEOUT',
          message: 'Optimization solver timed out',
          details: { timeoutMs: 10000 },
        },
      };
    }

    return {
      ok: false,
      status: 500,
      error: {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: { error: message },
      },
    };
  }
}
