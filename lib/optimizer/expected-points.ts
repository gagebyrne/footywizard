/**
 * Expected points calculation with fixture + form weighting.
 *
 * xP per fixture = 0.7 × (5 − difficulty) + 0.3 × form
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
    const fixtureScore = 5 - difficulty;
    total += 0.7 * fixtureScore + 0.3 * formScore;
  }
  return total;
}
