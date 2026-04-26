/**
 * ILP-based lineup optimizer
 * 
 * Uses Integer Linear Programming to find optimal 11-player lineup
 * respecting FPL constraints: budget, formation, team limits.
 * 
 * Single-formation solver (4-4-2) for M001/S02.
 */

import type { Player } from '../types/fpl';
// @ts-ignore - javascript-lp-solver has no types
import solver from 'javascript-lp-solver';

/**
 * Formation definition (position counts)
 */
export interface Formation {
  gk: number;  // Goalkeepers (always 1)
  def: number; // Defenders
  mid: number; // Midfielders
  fwd: number; // Forwards
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  /** Selected 11 players */
  players: Player[];
  
  /** Captain (player with highest expected points) */
  captain: Player;
  
  /** Total squad cost in £0.1m units */
  totalCost: number;
  
  /** Total expected points */
  totalExpectedPoints: number;
  
  /** Solve time in milliseconds */
  solveTimeMs: number;
}

/**
 * Solve optimal lineup for given formation
 * 
 * Creates ILP model with:
 * - Objective: maximize sum of selected players' expected points
 * - Binary decision variable per player (0=not selected, 1=selected)
 * - Constraints: budget (£100m), position counts, team limits (max 3), total 11 players
 * - 10s timeout
 * 
 * @param players - All available players
 * @param formation - Formation to optimize for (4-4-2 for M001)
 * @param expectedPoints - Map of player ID to expected points
 * @returns Optimization result, or null if infeasible
 */
export function solveLineup(
  players: Player[],
  formation: Formation,
  expectedPoints: Map<number, number>
): OptimizationResult | null {
  const startTime = Date.now();
  
  // Build ILP model
  const model: any = {
    optimize: 'expectedPoints',
    opType: 'max',
    constraints: {
      budget: { max: 1000 }, // £100m in £0.1m units
      totalSelected: { equal: 11 },
      gkCount: { equal: formation.gk },
      defCount: { equal: formation.def },
      midCount: { equal: formation.mid },
      fwdCount: { equal: formation.fwd },
    },
    variables: {} as Record<string, any>,
    binaries: {} as Record<string, number>,
  };

  // Add team limit constraints (max 3 players per team)
  const teamIds = new Set(players.map(p => p.team));
  for (const teamId of teamIds) {
    model.constraints[`team_${teamId}`] = { max: 3 };
  }

  // Add decision variable per player
  for (const player of players) {
    const varName = `player_${player.id}`;
    const points = expectedPoints.get(player.id) ?? 0;
    
    model.variables[varName] = {
      expectedPoints: points,
      budget: player.now_cost,
      totalSelected: 1,
      gkCount: player.element_type === 1 ? 1 : 0,
      defCount: player.element_type === 2 ? 1 : 0,
      midCount: player.element_type === 3 ? 1 : 0,
      fwdCount: player.element_type === 4 ? 1 : 0,
      [`team_${player.team}`]: 1,
    };
    
    // Mark as binary variable (0 or 1)
    model.binaries[varName] = 1;
  }

  // Solve with 10s timeout
  let result: any;
  try {
    const timeoutMs = 10000;
    const timeoutHandle = setTimeout(() => {
      throw new Error('Solver timeout');
    }, timeoutMs);
    
    result = solver.Solve(model);
    clearTimeout(timeoutHandle);
  } catch (error) {
    const solveTimeMs = Date.now() - startTime;
    console.error(`[ILP Solver] Solve failed after ${solveTimeMs}ms:`, error);
    return null;
  }

  const solveTimeMs = Date.now() - startTime;

  // Check feasibility
  if (!result.feasible) {
    console.warn('[ILP Solver] Infeasible solution', {
      solveTimeMs,
      playerCount: players.length,
      formation,
      reason: 'No valid lineup satisfies all constraints',
    });
    return null;
  }

  // Extract selected players
  const selectedPlayers: Player[] = [];
  for (const [varName, value] of Object.entries(result)) {
    if (typeof value === 'number' && value > 0.5 && varName.startsWith('player_')) {
      const playerId = parseInt(varName.replace('player_', ''), 10);
      const player = players.find(p => p.id === playerId);
      if (player) {
        selectedPlayers.push(player);
      }
    }
  }

  // Validate result
  if (selectedPlayers.length !== 11) {
    console.error('[ILP Solver] Invalid result: expected 11 players, got', selectedPlayers.length);
    return null;
  }

  // Calculate totals
  const totalCost = selectedPlayers.reduce((sum, p) => sum + p.now_cost, 0);
  const totalExpectedPoints = selectedPlayers.reduce(
    (sum, p) => sum + (expectedPoints.get(p.id) ?? 0),
    0
  );

  // Select captain (highest expected points)
  const captain = selectedPlayers.reduce((best, p) => {
    const pPoints = expectedPoints.get(p.id) ?? 0;
    const bestPoints = expectedPoints.get(best.id) ?? 0;
    return pPoints > bestPoints ? p : best;
  });

  console.log('[ILP Solver] Solution found', {
    solveTimeMs,
    totalCost,
    totalExpectedPoints,
    captainId: captain.id,
    captainName: captain.web_name,
  });

  return {
    players: selectedPlayers,
    captain,
    totalCost,
    totalExpectedPoints,
    solveTimeMs,
  };
}
