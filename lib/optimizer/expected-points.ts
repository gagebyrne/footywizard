/**
 * Expected points calculation with fixture + form weighting
 * 
 * Calculates expected points for a player using:
 * - 70% fixture difficulty (easier = higher score)
 * - 30% recent form
 * 
 * Boundary map spec: "Expected points formula = 70% fixture difficulty inverse + 30% form score"
 */

import type { Player, Fixture, Team } from '../types/fpl';

/**
 * Calculate expected points for a player based on their next fixture and recent form
 * 
 * Formula: (0.7 * fixtureScore) + (0.3 * formScore)
 * - fixtureScore: 5 - difficulty (0-5 scale, higher = easier)
 * - formScore: player.form converted to number
 * 
 * Edge cases:
 * - No upcoming fixture → return 0
 * - Empty form string → treat as 0
 * - Player not available (status !== 'a') → return 0
 * 
 * @param player - FPL player element
 * @param fixtures - All fixtures for the gameweek
 * @param teams - All teams (currently unused, but maintained for API compatibility)
 * @returns Expected points for the player
 */
export function calculateExpectedPoints(
  player: Player,
  fixtures: Fixture[],
  teams: Team[]
): number {
  // Edge case: player not available
  if (player.status !== 'a') {
    return 0;
  }

  // Edge case: empty form → treat as 0
  const formScore = player.form === '' ? 0 : parseFloat(player.form);

  // Find player's next fixture
  // Player's team can be either home (team_h) or away (team_a)
  const playerFixture = fixtures.find(
    (fixture) =>
      fixture.team_h === player.team || fixture.team_a === player.team
  );

  // Edge case: no upcoming fixture
  if (!playerFixture) {
    return 0;
  }

  // Determine difficulty based on whether player is home or away
  const difficulty =
    playerFixture.team_h === player.team
      ? playerFixture.team_h_difficulty
      : playerFixture.team_a_difficulty;

  // Calculate fixture score: inverse of difficulty (easier fixtures score higher)
  // Scale: 1 (hardest) → 4, 5 (easiest) → 0
  const fixtureScore = 5 - difficulty;

  // Apply 70/30 weighting
  return 0.7 * fixtureScore + 0.3 * formScore;
}
