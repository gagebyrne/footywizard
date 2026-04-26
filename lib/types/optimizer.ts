/**
 * Optimizer type definitions
 * 
 * Types for the ILP-based team optimization engine.
 */

import type { Player } from './fpl';

/**
 * Expected points calculation result
 */
export interface ExpectedPointsResult {
  /**
   * Calculated expected points for the player
   */
  points: number;

  /**
   * Fixture score component (0-5, higher is easier)
   */
  fixtureScore: number;

  /**
   * Form score component (0-10 typically)
   */
  formScore: number;
}

/**
 * Constraint status returned by optimization API
 */
export interface ConstraintStatus {
  budget: { used: number; limit: number };
  positions: Record<string, number>;
  teamLimits: Record<string, number>;
}

/**
 * Optimization API response
 */
export interface OptimizeResponse {
  lineup: Player[];
  captain: Player;
  expectedPoints: number;
  formation: string;
  constraints: ConstraintStatus;
}
