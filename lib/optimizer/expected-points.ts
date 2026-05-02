/**
 * Expected points calculation with fixture + form/ppg weighting.
 *
 * xP per fixture = (0.5 × ppg + 0.5 × form) × (1 + (3 − difficulty) × 0.25)
 *
 * Base score blends season-long consistency (ppg) with recent form equally.
 * Fixture multiplier scales that base: difficulty 1 → ×1.5, difficulty 3 → ×1.0 (neutral),
 * difficulty 5 → ×0.5. A player with zero form and zero ppg correctly scores 0.
 *
 * Total xP = sum across all of the player's fixtures in the gameweek
 * (handles double gameweeks).
 *
 * Returns 0 when:
 * - player.status !== 'a' (injured / doubtful / unavailable)
 * - player has no fixture in the supplied fixture list (blank gameweek)
 */

import type { Player, Fixture, Team } from '../types/fpl';

export function calculateExpectedPoints(
  player: Player,
  fixtures: Fixture[],
  _teams: Team[]
): number {
  if (player.status !== 'a') return 0;

  const formScore = player.form === '' ? 0 : parseFloat(player.form);
  const ppg = !player.points_per_game || player.points_per_game === '' ? 0 : parseFloat(player.points_per_game);
  const baseScore = 0.5 * ppg + 0.5 * formScore;

  const matching = fixtures.filter(
    (fixture) => fixture.team_h === player.team || fixture.team_a === player.team
  );
  if (matching.length === 0) return 0;

  let total = 0;
  for (const fixture of matching) {
    const difficulty =
      fixture.team_h === player.team
        ? fixture.team_h_difficulty
        : fixture.team_a_difficulty;
    const fixtureMultiplier = 1 + (3 - difficulty) * 0.25;
    total += baseScore * fixtureMultiplier;
  }
  return total;
}
