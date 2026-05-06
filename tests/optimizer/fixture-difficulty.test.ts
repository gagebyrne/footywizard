import { describe, it, expect } from 'vitest';
import { getFixtureMultiplier } from '../../lib/optimizer/fixture-difficulty';
import type { Fixture, Team } from '../../lib/types/fpl';

const makeTeam = (
  id: number,
  attackHome: number,
  attackAway: number,
  defenceHome: number,
  defenceAway: number
): Team =>
  ({
    id,
    name: `Team${id}`,
    short_name: `T${id}`,
    strength: 3,
    strength_overall_home: attackHome,
    strength_overall_away: attackAway,
    strength_attack_home: attackHome,
    strength_attack_away: attackAway,
    strength_defence_home: defenceHome,
    strength_defence_away: defenceAway,
  }) as Team;

const makeFixture = (homeTeamId: number, awayTeamId: number): Fixture =>
  ({ id: 1, event: 1, team_h: homeTeamId, team_a: awayTeamId, team_h_difficulty: 3, team_a_difficulty: 3 }) as Fixture;

// Three teams with distinct strength profiles
const playerTeam = makeTeam(1, 1200, 1100, 1200, 1100);
const strongOpponent = makeTeam(2, 1400, 1350, 1400, 1350);
const weakOpponent = makeTeam(3, 1000, 950, 1000, 950);
const allTeams = [playerTeam, strongOpponent, weakOpponent];

describe('getFixtureMultiplier', () => {
  describe('attack dimension (MID / FWD)', () => {
    it('lower multiplier vs strong opponent defence than vs weak opponent defence', () => {
      const vsStrong = getFixtureMultiplier(makeFixture(1, 2), 1, 3, allTeams);
      const vsWeak = getFixtureMultiplier(makeFixture(1, 3), 1, 3, allTeams);
      expect(vsStrong).toBeLessThan(vsWeak);
    });
  });

  describe('defence dimension (GK / DEF)', () => {
    it('lower multiplier vs strong opponent attack than vs weak opponent attack', () => {
      const vsStrong = getFixtureMultiplier(makeFixture(1, 2), 1, 1, allTeams); // GK
      const vsWeak = getFixtureMultiplier(makeFixture(1, 3), 1, 1, allTeams);
      expect(vsStrong).toBeLessThan(vsWeak);
    });
  });

  describe('dimension split', () => {
    it('same fixture produces different multipliers for GK vs MID', () => {
      const fixture = makeFixture(1, 2);
      const gkMultiplier = getFixtureMultiplier(fixture, 1, 1, allTeams);
      const midMultiplier = getFixtureMultiplier(fixture, 1, 3, allTeams);
      // strongOpponent has equal attack and defence so the normalized values
      // are the same — multipliers will be equal here. Use asymmetric teams.
      const asymTeams = [
        makeTeam(1, 1200, 1100, 1200, 1100),
        makeTeam(2, 1400, 1350, 1000, 950), // strong attack, weak defence
      ];
      const gk = getFixtureMultiplier(makeFixture(1, 2), 1, 1, asymTeams);
      const mid = getFixtureMultiplier(makeFixture(1, 2), 1, 3, asymTeams);
      expect(gk).not.toBe(mid);
    });
  });

  describe('home / away venue', () => {
    it('home fixture gives higher multiplier than away against same opponent', () => {
      // Opponent has stronger home defence than away defence.
      // A MID facing them at home (opponent defends away = weaker) should get
      // a higher multiplier than when facing them away (opponent defends at home = stronger).
      const venueTeams = [
        makeTeam(1, 1200, 1100, 1200, 1100), // player's team
        makeTeam(2, 1300, 1200, 1350, 1150), // opponent: strong home def (1350), weaker away def (1150)
        makeTeam(3, 1000, 950, 1050, 950),   // weak team (provides range for normalisation)
        makeTeam(4, 1450, 1400, 1450, 1400), // strong team (provides range for normalisation)
      ];
      const homeFixture = makeFixture(1, 2); // player's team is home
      const awayFixture = makeFixture(2, 1); // player's team is away
      const homeMultiplier = getFixtureMultiplier(homeFixture, 1, 3, venueTeams);
      const awayMultiplier = getFixtureMultiplier(awayFixture, 1, 3, venueTeams);
      expect(homeMultiplier).toBeGreaterThan(awayMultiplier);
    });
  });

  describe('multiplier range', () => {
    it('all outputs fall within 0.5–1.5', () => {
      const fixture = makeFixture(1, 2);
      [1, 2, 3, 4].forEach((elementType) => {
        const m = getFixtureMultiplier(fixture, 1, elementType, allTeams);
        expect(m).toBeGreaterThanOrEqual(0.5);
        expect(m).toBeLessThanOrEqual(1.5);
      });
    });

    it('returns neutral multiplier (1.0) when all teams share the same strength', () => {
      const uniformTeams = [
        makeTeam(1, 1200, 1200, 1200, 1200),
        makeTeam(2, 1200, 1200, 1200, 1200),
      ];
      const m = getFixtureMultiplier(makeFixture(1, 2), 1, 3, uniformTeams);
      expect(m).toBeCloseTo(1.0);
    });
  });
});
