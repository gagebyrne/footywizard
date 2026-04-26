/**
 * Post-solve lineup validation
 * 
 * Defensive validation to catch solver bugs. Every lineup returned by
 * the ILP solver MUST pass these checks.
 */

import type { Player } from '../types/fpl';
import type { Formation } from './ilp-solver';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Overall pass/fail */
  valid: boolean;
  
  /** List of constraint violations (empty if valid) */
  violations: string[];
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

/**
 * Validate lineup against FPL constraints
 * 
 * Checks:
 * - Total 11 players
 * - Budget: sum(player.now_cost) <= 1000 (£100m in £0.1m units)
 * - Position counts match claimed formation
 * - Team limits: max 3 players per team
 * 
 * @param lineup - Selected 11 players
 * @param formation - Claimed formation
 * @returns Validation result with violations if any
 */
export function validateLineup(
  lineup: Player[],
  formation: Formation
): ValidationResult {
  const violations: string[] = [];

  // Check total count
  if (lineup.length !== 11) {
    violations.push(`Expected 11 players, got ${lineup.length}`);
  }

  // Check budget
  const totalCost = lineup.reduce((sum, p) => sum + p.now_cost, 0);
  if (totalCost > 1000) {
    violations.push(
      `Budget exceeded: £${(totalCost / 10).toFixed(1)}m > £100.0m`
    );
  }

  // Check position counts
  const positionCounts = {
    gk: lineup.filter(p => p.element_type === 1).length,
    def: lineup.filter(p => p.element_type === 2).length,
    mid: lineup.filter(p => p.element_type === 3).length,
    fwd: lineup.filter(p => p.element_type === 4).length,
  };

  if (positionCounts.gk !== formation.gk) {
    violations.push(
      `GK count mismatch: expected ${formation.gk}, got ${positionCounts.gk}`
    );
  }
  if (positionCounts.def !== formation.def) {
    violations.push(
      `DEF count mismatch: expected ${formation.def}, got ${positionCounts.def}`
    );
  }
  if (positionCounts.mid !== formation.mid) {
    violations.push(
      `MID count mismatch: expected ${formation.mid}, got ${positionCounts.mid}`
    );
  }
  if (positionCounts.fwd !== formation.fwd) {
    violations.push(
      `FWD count mismatch: expected ${formation.fwd}, got ${positionCounts.fwd}`
    );
  }

  // Check team limits (max 3 per team)
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
