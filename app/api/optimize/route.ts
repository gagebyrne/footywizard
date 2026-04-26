import FplFetch from 'fpl-fetch';
import type { Player, Team, Fixture, Event } from '@/lib/types/fpl';
import { calculateExpectedPoints } from '@/lib/optimizer/expected-points';
import { optimizeAllFormations } from '@/lib/optimizer/ilp-solver';
import { VALID_FORMATIONS } from '@/lib/optimizer/formation-validator';
import { savePrediction } from '@/lib/history/predictions';

/**
 * Optimize endpoint
 * 
 * POST /api/optimize
 * 
 * Fetches current FPL data, calculates expected points for all players,
 * runs multi-formation ILP optimization, and returns optimal lineup with captain.
 * 
 * Error handling:
 * - 422: No valid lineup exists for constraints (infeasible)
 * - 504: Solver timeout
 * - 500: Validation failure (solver bug) or upstream API failure
 */

const fpl = new FplFetch();

interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ConstraintStatus {
  budget: { used: number; limit: number };
  positions: Record<string, number>;
  teamLimits: Record<string, number>;
}

interface OptimizeResponse {
  lineup: Player[];
  captain: Player;
  expectedPoints: number;
  formation: string;
  constraints: ConstraintStatus;
}

export async function POST() {
  const requestStartTime = Date.now();
  console.log('[API /api/optimize] Request received');

  try {
    // Fetch FPL data
    console.log('[API /api/optimize] Fetching FPL data...');
    const bootstrapData = await fpl.getBootstrapData();
    
    const players: Player[] = bootstrapData.elements;
    const teams: Team[] = bootstrapData.teams;
    const events: Event[] = bootstrapData.events;

    // Find current gameweek
    const currentEvent = events.find((e) => e.is_current);
    if (!currentEvent) {
      console.error('[API /api/optimize] No current gameweek found');
      return Response.json(
        {
          error: 'NO_CURRENT_GAMEWEEK',
          message: 'Unable to determine current gameweek',
        } as ErrorResponse,
        { status: 500 }
      );
    }

    console.log(`[API /api/optimize] Current gameweek: ${currentEvent.id}`);

    // Fetch fixtures for current gameweek
    const allFixtures = await fpl.getFixtures();
    const fixtures: Fixture[] = allFixtures.filter(
      (f) => f.event === currentEvent.id
    );

    console.log(
      `[API /api/optimize] Loaded ${players.length} players, ${fixtures.length} fixtures for GW${currentEvent.id}`
    );

    // Calculate expected points for all players
    const expectedPoints = new Map<number, number>();
    for (const player of players) {
      const points = calculateExpectedPoints(player, fixtures, teams);
      expectedPoints.set(player.id, points);
    }

    console.log('[API /api/optimize] Calculated expected points');

    // Run multi-formation optimization
    const optimizationStartTime = Date.now();
    let result;
    
    try {
      result = optimizeAllFormations(players, expectedPoints);
    } catch (error) {
      // Validation failure indicates solver bug
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('[API /api/optimize] Validation failure:', message);
      
      return Response.json(
        {
          error: 'SOLVER_BUG',
          message: 'Lineup validation failed (solver bug)',
          details: { validationError: message },
        } as ErrorResponse,
        { status: 500 }
      );
    }

    const optimizationEndTime = Date.now();
    const solveTimeMs = optimizationEndTime - optimizationStartTime;

    // Check if optimization returned a result
    if (result === null) {
      // All formations infeasible
      console.warn('[API /api/optimize] No valid lineup found (infeasible)', {
        solveTimeMs,
        playerCount: players.length,
        fixtureCount: fixtures.length,
      });

      return Response.json(
        {
          error: 'NO_VALID_LINEUP',
          message: 'No valid lineup satisfies all constraints (budget, positions, team limits)',
          details: {
            playerCount: players.length,
            availablePlayers: players.filter((p) => p.status === 'a').length,
            solveTimeMs,
          },
        } as ErrorResponse,
        { status: 422 }
      );
    }

    // Determine which formation was selected
    const formationName = Object.keys(VALID_FORMATIONS).find((name) => {
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

    // Build constraint status
    const positionCounts = {
      GK: result.players.filter((p) => p.element_type === 1).length,
      DEF: result.players.filter((p) => p.element_type === 2).length,
      MID: result.players.filter((p) => p.element_type === 3).length,
      FWD: result.players.filter((p) => p.element_type === 4).length,
    };

    const teamCounts: Record<string, number> = {};
    for (const player of result.players) {
      const teamName = teams.find((t) => t.id === player.team)?.short_name || String(player.team);
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
    }

    const constraints: ConstraintStatus = {
      budget: {
        used: result.totalCost,
        limit: 1000,
      },
      positions: positionCounts,
      teamLimits: teamCounts,
    };

    const requestEndTime = Date.now();
    const totalTimeMs = requestEndTime - requestStartTime;

    console.log('[API /api/optimize] Success', {
      formation: formationName,
      totalExpectedPoints: result.totalExpectedPoints.toFixed(2),
      totalCost: `£${(result.totalCost / 10).toFixed(1)}m`,
      captain: result.captain.web_name,
      solveTimeMs,
      totalTimeMs,
    });

    // Save prediction to historical record (fire-and-forget)
    savePrediction(
      currentEvent.id,
      result.players,
      result.captain,
      result.totalExpectedPoints,
      formationName
    ).catch((error) => {
      console.error('[API /api/optimize] Failed to save prediction', {
        gameweek: currentEvent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return Response.json({
      lineup: result.players,
      captain: result.captain,
      expectedPoints: result.totalExpectedPoints,
      formation: formationName,
      constraints,
    } as OptimizeResponse);
  } catch (error) {
    const requestEndTime = Date.now();
    const totalTimeMs = requestEndTime - requestStartTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[API /api/optimize] Request failed', {
      error: message,
      totalTimeMs,
    });

    // Check if it's a timeout error
    if (message.includes('timeout') || message.includes('Timeout')) {
      return Response.json(
        {
          error: 'OPTIMIZATION_TIMEOUT',
          message: 'Optimization solver timed out',
          details: { timeoutMs: 10000 },
        } as ErrorResponse,
        { status: 504 }
      );
    }

    // Generic error
    return Response.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: { error: message },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
