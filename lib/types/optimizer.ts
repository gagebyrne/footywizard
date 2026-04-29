/**
 * Optimizer type definitions.
 */

import type { Player } from './fpl';

export interface ExpectedPointsResult {
  points: number;
  fixtureScore: number;
  formScore: number;
}

export interface ConstraintStatus {
  budget: { used: number; limit: number };
  positions: Record<string, number>;
  teamLimits: Record<string, number>;
}

export interface OptimizeResponse {
  /** Selected players. May contain fewer than 11 when `partial` is true. */
  lineup: Player[];
  /** Captain — null only if zero viable players were available. */
  captain: Player | null;
  /** Total expected points INCLUDING the captain bonus (sum of lineup xP + captain xP). */
  expectedPoints: number;
  formation: string;
  /** True when the squad lacked enough viable players for a full XI; some pitch slots will be empty. */
  partial: boolean;
  constraints: ConstraintStatus;
}
