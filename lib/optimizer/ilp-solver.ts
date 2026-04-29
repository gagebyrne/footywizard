/**
 * ILP-based lineup optimizer
 *
 * Multi-formation ILP that maximises expected points subject to FPL constraints
 * (budget, formation, max 3 per club). Two-pass:
 *
 * 1. Exact pass — total = 11, position counts match formation exactly.
 * 2. Partial fallback — total ≤ 11, position counts ≤ formation. Used when the
 *    squad has too few viable players to fill a full XI.
 *
 * Captain-aware: each candidate captain c is solved with c's xP doubled and
 * c pinned into the lineup. Best (lineup × captain) wins, where "best" =
 * lineup xP + captain xP (i.e., total points with captain bonus).
 */

import type { Player } from '../types/fpl';
import { VALID_FORMATIONS, validateLineup } from './formation-validator';
// @ts-ignore - javascript-lp-solver has no types
import solver from 'javascript-lp-solver';

export interface Formation {
  gk: number;
  def: number;
  mid: number;
  fwd: number;
}

export interface OptimizationResult {
  /** Selected players (≤ 11 in partial mode). */
  players: Player[];
  /** Captain — null only if no viable players. */
  captain: Player | null;
  /** Sum of player.now_cost across the lineup. */
  totalCost: number;
  /**
   * Total expected points INCLUDING the captain bonus
   * (sum of selected players' xP + captain's xP).
   */
  totalExpectedPoints: number;
  /** True if some slots are empty (partial fallback was used). */
  partial: boolean;
  /** Solve time in milliseconds. */
  solveTimeMs: number;
}

interface SolveOptions {
  budgetLimit?: number;
  partial?: boolean;
  /** Captain candidate. xP is doubled in the objective and the player is forced selected. */
  captainId?: number;
}

/**
 * Solve a single (formation, captain, mode) ILP.
 * Returns the selected players in solver order, or null if infeasible.
 */
function solveOne(
  players: Player[],
  formation: Formation,
  expectedPoints: Map<number, number>,
  options: SolveOptions
): Player[] | null {
  const { budgetLimit = 1000, partial = false, captainId } = options;

  const totalConstraint = partial ? { max: 11 } : { equal: 11 };
  const posConstraint = (n: number) => (partial ? { max: n } : { equal: n });

  const model: any = {
    optimize: 'expectedPoints',
    opType: 'max',
    constraints: {
      budget: { max: budgetLimit },
      totalSelected: totalConstraint,
      gkCount: posConstraint(formation.gk),
      defCount: posConstraint(formation.def),
      midCount: posConstraint(formation.mid),
      fwdCount: posConstraint(formation.fwd),
    },
    variables: {} as Record<string, any>,
    binaries: {} as Record<string, number>,
  };

  const teamIds = new Set(players.map((p) => p.team));
  for (const teamId of teamIds) {
    model.constraints[`team_${teamId}`] = { max: 3 };
  }

  for (const player of players) {
    const varName = `player_${player.id}`;
    const basePoints = expectedPoints.get(player.id) ?? 0;
    const objCoeff = player.id === captainId ? basePoints * 2 : basePoints;

    model.variables[varName] = {
      expectedPoints: objCoeff,
      budget: player.now_cost,
      totalSelected: 1,
      gkCount: player.element_type === 1 ? 1 : 0,
      defCount: player.element_type === 2 ? 1 : 0,
      midCount: player.element_type === 3 ? 1 : 0,
      fwdCount: player.element_type === 4 ? 1 : 0,
      [`team_${player.team}`]: 1,
    };
    model.binaries[varName] = 1;
  }

  // Pin captain into the lineup with an equality constraint on a unique selector.
  if (captainId !== undefined) {
    const captainKey = `pin_captain`;
    model.constraints[captainKey] = { equal: 1 };
    const captainVar = model.variables[`player_${captainId}`];
    if (!captainVar) return null;
    captainVar[captainKey] = 1;
    for (const player of players) {
      if (player.id !== captainId) {
        model.variables[`player_${player.id}`][captainKey] = 0;
      }
    }
  }

  let result: any;
  try {
    result = solver.Solve(model);
  } catch (error) {
    console.error('[ILP Solver] Solve threw:', error);
    return null;
  }

  if (!result.feasible) return null;

  const selected: Player[] = [];
  for (const [varName, value] of Object.entries(result)) {
    if (typeof value === 'number' && value > 0.5 && varName.startsWith('player_')) {
      const id = parseInt(varName.replace('player_', ''), 10);
      const p = players.find((pl) => pl.id === id);
      if (p) selected.push(p);
    }
  }
  return selected;
}

interface Candidate {
  players: Player[];
  captain: Player;
  formationName: string;
  formation: Formation;
  /** Sum of xP across selected players (no captain bonus). */
  baseSum: number;
  /** baseSum + captain.xP — the value displayed and used to rank. */
  totalWithCaptainBonus: number;
}

function buildCandidate(
  selected: Player[],
  captain: Player,
  formationName: string,
  formation: Formation,
  expectedPoints: Map<number, number>
): Candidate {
  const baseSum = selected.reduce((s, p) => s + (expectedPoints.get(p.id) ?? 0), 0);
  const captainXp = expectedPoints.get(captain.id) ?? 0;
  return {
    players: selected,
    captain,
    formationName,
    formation,
    baseSum,
    totalWithCaptainBonus: baseSum + captainXp,
  };
}

/**
 * Tiebreak: in partial mode, prefer formations with the most filled slots,
 * then highest total points, then alphabetical formation name (deterministic).
 */
function comparePartial(a: Candidate, b: Candidate): number {
  if (a.players.length !== b.players.length) return b.players.length - a.players.length;
  if (a.totalWithCaptainBonus !== b.totalWithCaptainBonus) {
    return b.totalWithCaptainBonus - a.totalWithCaptainBonus;
  }
  return a.formationName.localeCompare(b.formationName);
}

function compareExact(a: Candidate, b: Candidate): number {
  if (a.totalWithCaptainBonus !== b.totalWithCaptainBonus) {
    return b.totalWithCaptainBonus - a.totalWithCaptainBonus;
  }
  return a.formationName.localeCompare(b.formationName);
}

/**
 * Pick captain candidates: top N by xP. With ≤ 30 viable players we use them
 * all; for full-pool optimisation (~600 players) we cap at 30 to keep the
 * outer loop tractable. The optimal captain is always among the high-xP set.
 */
function captainCandidates(players: Player[], expectedPoints: Map<number, number>, cap = 20): Player[] {
  const withPoints = players.filter((p) => (expectedPoints.get(p.id) ?? 0) > 0);
  if (withPoints.length === 0) return [];
  return [...withPoints]
    .sort((a, b) => (expectedPoints.get(b.id) ?? 0) - (expectedPoints.get(a.id) ?? 0))
    .slice(0, cap);
}

export function optimizeAllFormations(
  players: Player[],
  expectedPoints: Map<number, number>,
  budgetLimit: number = 1000
): OptimizationResult | null {
  const startTime = Date.now();
  const formationNames = Object.keys(VALID_FORMATIONS);
  const captains = captainCandidates(players, expectedPoints);

  if (captains.length === 0) {
    console.warn('[Multi-Formation] No players with positive xP — nothing to optimise');
    return null;
  }

  // Pass 1: exact mode
  const exactCandidates: Candidate[] = [];
  for (const formationName of formationNames) {
    const formation = VALID_FORMATIONS[formationName];
    for (const captain of captains) {
      const selected = solveOne(players, formation, expectedPoints, {
        budgetLimit,
        partial: false,
        captainId: captain.id,
      });
      if (selected && selected.length === 11) {
        exactCandidates.push(
          buildCandidate(selected, captain, formationName, formation, expectedPoints)
        );
      }
    }
  }

  let best: Candidate | null = null;
  let partial = false;

  if (exactCandidates.length > 0) {
    exactCandidates.sort(compareExact);
    best = exactCandidates[0];
  } else {
    // Pass 2: partial fallback
    const partialCandidates: Candidate[] = [];
    for (const formationName of formationNames) {
      const formation = VALID_FORMATIONS[formationName];
      for (const captain of captains) {
        const selected = solveOne(players, formation, expectedPoints, {
          budgetLimit,
          partial: true,
          captainId: captain.id,
        });
        if (selected && selected.length > 0) {
          partialCandidates.push(
            buildCandidate(selected, captain, formationName, formation, expectedPoints)
          );
        }
      }
    }
    if (partialCandidates.length === 0) {
      console.warn('[Multi-Formation] All formations infeasible (exact and partial)');
      return null;
    }
    partialCandidates.sort(comparePartial);
    best = partialCandidates[0];
    partial = true;
  }

  // Defensive validation — catches solver bugs
  const validation = validateLineup(best.players, best.formation, { budgetLimit, partial });
  if (!validation.valid) {
    const debug = {
      formation: best.formationName,
      partial,
      lineup: best.players.map((p) => ({
        id: p.id,
        name: p.web_name,
        team: p.team,
        position: p.element_type,
        cost: p.now_cost,
        expectedPoints: expectedPoints.get(p.id),
      })),
      captainId: best.captain.id,
      violations: validation.violations,
    };
    console.error('[Multi-Formation] Validation failed (solver bug)', debug);
    throw new Error(
      `Lineup validation failed: ${validation.violations.join(', ')}. Debug: ${JSON.stringify(debug)}`
    );
  }

  const totalCost = best.players.reduce((s, p) => s + p.now_cost, 0);
  const totalTime = Date.now() - startTime;

  console.log('[Multi-Formation] Best selected', {
    formation: best.formationName,
    partial,
    filledSlots: best.players.length,
    totalWithCaptainBonus: best.totalWithCaptainBonus.toFixed(2),
    captain: best.captain.web_name,
    totalCost,
    totalTime,
  });

  return {
    players: best.players,
    captain: best.captain,
    totalCost,
    totalExpectedPoints: best.totalWithCaptainBonus,
    partial,
    solveTimeMs: totalTime,
  };
}

/**
 * Single-formation solver. Kept for the existing unit tests, which exercise
 * the exact ILP without the captain-aware outer loop.
 */
export function solveLineup(
  players: Player[],
  formation: Formation,
  expectedPoints: Map<number, number>,
  budgetLimit: number = 1000
): OptimizationResult | null {
  const startTime = Date.now();
  const selected = solveOne(players, formation, expectedPoints, {
    budgetLimit,
    partial: false,
  });
  if (!selected || selected.length !== 11) return null;

  const totalCost = selected.reduce((sum, p) => sum + p.now_cost, 0);
  const baseSum = selected.reduce((sum, p) => sum + (expectedPoints.get(p.id) ?? 0), 0);
  const captain = selected.reduce((best, p) => {
    const pPoints = expectedPoints.get(p.id) ?? 0;
    const bestPoints = expectedPoints.get(best.id) ?? 0;
    return pPoints > bestPoints ? p : best;
  });
  const captainXp = expectedPoints.get(captain.id) ?? 0;

  return {
    players: selected,
    captain,
    totalCost,
    totalExpectedPoints: baseSum + captainXp,
    partial: false,
    solveTimeMs: Date.now() - startTime,
  };
}
