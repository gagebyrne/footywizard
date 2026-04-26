/**
 * Optimizer type definitions
 * 
 * Types for the ILP-based team optimization engine.
 */

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
