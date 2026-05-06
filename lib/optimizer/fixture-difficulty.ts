import type { Fixture, Team } from '../types/fpl';

const ATTACKER_TYPES = new Set([3, 4]); // MID, FWD

/**
 * Returns a fixture multiplier in 0.5–1.5 for a player against a given fixture.
 *
 * Attack dimension (MID/FWD): how hard it is to score against the opponent,
 * derived from the opponent's defensive strength at the relevant venue.
 *
 * Defence dimension (GK/DEF): how dangerous the opponent's attack is,
 * derived from the opponent's attacking strength at the relevant venue.
 *
 * Strengths are normalised across all supplied teams so the multiplier is
 * always in the 0.5–1.5 range. When all teams share the same strength the
 * multiplier is 1.0 (neutral).
 */
export function getFixtureMultiplier(
  fixture: Fixture,
  playerTeamId: number,
  elementType: number,
  teams: Team[]
): number {
  const isHome = fixture.team_h === playerTeamId;
  const opponentId = isHome ? fixture.team_a : fixture.team_h;
  const opponent = teams.find((t) => t.id === opponentId);
  if (!opponent) return 1.0;

  const isAttacker = ATTACKER_TYPES.has(elementType);

  let opponentStrength: number;
  let allStrengths: number[];

  if (isAttacker) {
    // Player attacks against opponent's defence.
    // When player is home the opponent defends away, and vice versa.
    opponentStrength = isHome
      ? opponent.strength_defence_away
      : opponent.strength_defence_home;
    allStrengths = teams.map((t) =>
      isHome ? t.strength_defence_away : t.strength_defence_home
    );
  } else {
    // Player defends against opponent's attack.
    opponentStrength = isHome
      ? opponent.strength_attack_away
      : opponent.strength_attack_home;
    allStrengths = teams.map((t) =>
      isHome ? t.strength_attack_away : t.strength_attack_home
    );
  }

  const min = Math.min(...allStrengths);
  const max = Math.max(...allStrengths);
  if (min === max) return 1.0;

  const normalised = (opponentStrength - min) / (max - min);
  return 0.5 + (1 - normalised) * 1.0;
}
