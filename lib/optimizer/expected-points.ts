
import type { Player, Fixture, Team } from '../types/fpl';
import { getFixtureMultiplier } from './fixture-difficulty';

function parseFloat0(s: string | null | undefined): number {
  if (!s || s === '') return 0;
  return parseFloat(s);
}

const MINUTES_FLOOR = 450;

function baseScore(player: Player): number {
  const ppg = parseFloat0(player.points_per_game);
  const form = parseFloat0(player.form);

  if (player.minutes < MINUTES_FLOOR) {
    return 0.60 * ppg + 0.40 * form;
  }

  switch (player.element_type) {
    case 1: // GK
      return 0.50 * (player.clean_sheets_per_90 * 6)
           + 0.25 * (player.saves_per_90 * 0.33)
           + 0.25 * ppg;
    case 2: // DEF
      return 0.40 * (player.clean_sheets_per_90 * 6)
           + 0.35 * form
           + 0.25 * ppg;
    case 3: // MID
      return 0.45 * (player.expected_goal_involvements_per_90 * 4.5)
           + 0.30 * form
           + 0.25 * ppg;
    case 4: // FWD
      return 0.45 * (player.expected_goal_involvements_per_90 * 5.0)
           + 0.30 * form
           + 0.25 * ppg;
    default:
      return 0.5 * ppg + 0.5 * form;
  }
}

const PARTICIPATION_THRESHOLD = 25;

function availabilityMultiplier(chance: number | null): number {
  if (chance === null) return 1.0;
  if (chance < PARTICIPATION_THRESHOLD) return 0;
  return 0.85 + 0.15 * (chance / 100);
}

export function calculateExpectedPoints(
  player: Player,
  fixtures: Fixture[],
  teams: Team[]
): number {
  const avail = availabilityMultiplier(player.chance_of_playing_this_round);
  if (avail === 0) return 0;

  const base = baseScore(player);

  const matching = fixtures.filter(
    (fixture) => fixture.team_h === player.team || fixture.team_a === player.team
  );
  if (matching.length === 0) return 0;

  let total = 0;
  for (const fixture of matching) {
    const fixtureMultiplier = getFixtureMultiplier(fixture, player.team, player.element_type, teams);
    total += base * fixtureMultiplier;
  }
  return total * avail;
}
