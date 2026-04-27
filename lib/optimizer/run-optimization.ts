import FplFetch from 'fpl-fetch';
import type { Player, Team, Fixture, Event } from '@/lib/types/fpl';
import type { OptimizeResponse, ConstraintStatus } from '@/lib/types/optimizer';
import { calculateExpectedPoints } from '@/lib/optimizer/expected-points';
import { optimizeAllFormations } from '@/lib/optimizer/ilp-solver';
import { VALID_FORMATIONS } from '@/lib/optimizer/formation-validator';
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

export async function runOptimization(): Promise<OptimizationResult> {
  const requestStartTime = Date.now();
  console.log('[runOptimization] Started');

  try {
    const bootstrapData = await fpl.getBootstrapData();
    const players: Player[] = bootstrapData.elements;
    const teams: Team[] = bootstrapData.teams;
    const events: Event[] = bootstrapData.events;

    const currentEvent = events.find((e) => e.is_current);
    if (!currentEvent) {
      console.error('[runOptimization] No current gameweek found');
      return {
        ok: false,
        status: 500,
        error: {
          error: 'NO_CURRENT_GAMEWEEK',
          message: 'Unable to determine current gameweek',
        },
      };
    }

    const allFixtures = await fpl.getFixtures();
    const fixtures: Fixture[] = allFixtures.filter((f) => f.event === currentEvent.id);

    const expectedPoints = new Map<number, number>();
    for (const player of players) {
      expectedPoints.set(player.id, calculateExpectedPoints(player, fixtures, teams));
    }

    const optimizationStartTime = Date.now();
    let result;
    try {
      result = optimizeAllFormations(players, expectedPoints);
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
      console.warn('[runOptimization] No valid lineup found (infeasible)', {
        solveTimeMs,
        playerCount: players.length,
      });
      return {
        ok: false,
        status: 422,
        error: {
          error: 'NO_VALID_LINEUP',
          message:
            'No valid lineup satisfies all constraints (budget, positions, team limits)',
          details: {
            playerCount: players.length,
            availablePlayers: players.filter((p) => p.status === 'a').length,
            solveTimeMs,
          },
        },
      };
    }

    const formationName =
      Object.keys(VALID_FORMATIONS).find((name) => {
        const formation = VALID_FORMATIONS[name];
        const positionCounts = {
          gk: result.players.filter((p) => p.element_type === 1).length,
          def: result.players.filter((p) => p.element_type === 2).length,
          mid: result.players.filter((p) => p.element_type === 3).length,
          fwd: result.players.filter((p) => p.element_type === 4).length,
        };
        return (
          positionCounts.gk === formation.gk &&
          positionCounts.def === formation.def &&
          positionCounts.mid === formation.mid &&
          positionCounts.fwd === formation.fwd
        );
      }) || 'unknown';

    const positionCounts = {
      GK: result.players.filter((p) => p.element_type === 1).length,
      DEF: result.players.filter((p) => p.element_type === 2).length,
      MID: result.players.filter((p) => p.element_type === 3).length,
      FWD: result.players.filter((p) => p.element_type === 4).length,
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
      totalExpectedPoints: result.totalExpectedPoints.toFixed(2),
      solveTimeMs,
      totalTimeMs: Date.now() - requestStartTime,
    });

    savePrediction(
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

    return {
      ok: true,
      data: {
        lineup: result.players,
        captain: result.captain,
        expectedPoints: result.totalExpectedPoints,
        formation: formationName,
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
