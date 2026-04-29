/**
 * Post-solve lineup validation
 *
 * Defensive validation to catch solver bugs. Every lineup returned by
 * the ILP solver MUST pass these checks.
 */

import type { Player } from '../types/fpl';
import type { Formation } from './ilp-solver';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export interface ValidateOptions {
  /** Max squad cost in £0.1m units. Defaults to 1000 (£100m). */
  budgetLimit?: number;
  /**
   * Partial mode allows lineups with fewer than 11 players (and fewer than the
   * formation's required position counts). Used when the squad has insufficient
   * viable players for a full lineup.
   */
  partial?: boolean;
}

/**
 * All valid FPL formations (11 players: GK=1, DEF+MID+FWD=10)
 */
export const VALID_FORMATIONS: Record<string, Formation> = {
  '3-4-3': { gk: 1, def: 3, mid: 4, fwd: 3 },
  '3-5-2': { gk: 1, def: 3, mid: 5, fwd: 2 },
  '4-3-3': { gk: 1, def: 4, mid: 3, fwd: 3 },
  '4-4-2': { gk: 1, def: 4, mid: 4, fwd: 2 },
  '4-5-1': { gk: 1, def: 4, mid: 5, fwd: 1 },
  '5-3-2': { gk: 1, def: 5, mid: 3, fwd: 2 },
  '5-4-1': { gk: 1, def: 5, mid: 4, fwd: 1 },
};

export function validateLineup(
  lineup: Player[],
  formation: Formation,
  options: ValidateOptions = {}
): ValidationResult {
  const { budgetLimit = 1000, partial = false } = options;
  const violations: string[] = [];

  // Total count
  if (partial) {
    if (lineup.length > 11) {
      violations.push(`Expected at most 11 players, got ${lineup.length}`);
    }
  } else if (lineup.length !== 11) {
    violations.push(`Expected 11 players, got ${lineup.length}`);
  }

  // Budget
  const totalCost = lineup.reduce((sum, p) => sum + p.now_cost, 0);
  if (totalCost > budgetLimit) {
    violations.push(
      `Budget exceeded: £${(totalCost / 10).toFixed(1)}m > £${(budgetLimit / 10).toFixed(1)}m`
    );
  }

  // Position counts
  const positionCounts = {
    gk: lineup.filter((p) => p.element_type === 1).length,
    def: lineup.filter((p) => p.element_type === 2).length,
    mid: lineup.filter((p) => p.element_type === 3).length,
    fwd: lineup.filter((p) => p.element_type === 4).length,
  };

  const checkPos = (label: string, actual: number, expected: number) => {
    if (partial) {
      if (actual > expected) {
        violations.push(`${label} count over cap: expected ≤ ${expected}, got ${actual}`);
      }
    } else if (actual !== expected) {
      violations.push(`${label} count mismatch: expected ${expected}, got ${actual}`);
    }
  };

  checkPos('GK', positionCounts.gk, formation.gk);
  checkPos('DEF', positionCounts.def, formation.def);
  checkPos('MID', positionCounts.mid, formation.mid);
  checkPos('FWD', positionCounts.fwd, formation.fwd);

  // Team limits (max 3 per team) — same in both modes
  const teamCounts = new Map<number, number>();
  for (const player of lineup) {
    teamCounts.set(player.team, (teamCounts.get(player.team) ?? 0) + 1);
  }
  for (const [teamId, count] of teamCounts) {
    if (count > 3) {
      violations.push(`Team ${teamId} has ${count} players (max 3)`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
