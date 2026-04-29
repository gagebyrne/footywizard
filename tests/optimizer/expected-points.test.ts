/**
 * Tests for expected points calculation
 */

import { describe, it, expect } from 'vitest';
import { calculateExpectedPoints } from '../../lib/optimizer/expected-points';
import type { Player, Fixture, Team } from '../../lib/types/fpl';

// Test fixtures
const mockTeams: Team[] = [
  {
    id: 1,
    name: 'Arsenal',
    short_name: 'ARS',
    strength: 4,
    strength_overall_home: 1300,
    strength_overall_away: 1250,
    strength_attack_home: 1300,
    strength_attack_away: 1250,
    strength_defence_home: 1300,
    strength_defence_away: 1250,
  } as Team,
  {
    id: 2,
    name: 'Liverpool',
    short_name: 'LIV',
    strength: 5,
    strength_overall_home: 1400,
    strength_overall_away: 1350,
    strength_attack_home: 1400,
    strength_attack_away: 1350,
    strength_defence_home: 1400,
    strength_defence_away: 1350,
  } as Team,
];

describe('calculateExpectedPoints', () => {
  describe('70/30 weighting calculation', () => {
    it('should calculate expected points with correct 70/30 weighting for easy fixture', () => {
      const player: Partial<Player> = {
        id: 1,
        web_name: 'Salah',
        team: 1,
        form: '7.5',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2, // Easy home fixture
          team_a_difficulty: 4,
        } as Fixture,
      ];

      // fixtureScore = 5 - 2 = 3
      // formScore = 7.5
      // expected = (0.7 * 3) + (0.3 * 7.5) = 2.1 + 2.25 = 4.35
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(4.35);
    });

    it('should calculate expected points for away fixture', () => {
      const player: Partial<Player> = {
        id: 2,
        web_name: 'Kane',
        team: 2,
        form: '6.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 4,
          team_a_difficulty: 3, // Moderate away difficulty
        } as Fixture,
      ];

      // fixtureScore = 5 - 3 = 2
      // formScore = 6.0
      // expected = (0.7 * 2) + (0.3 * 6.0) = 1.4 + 1.8 = 3.2
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBeCloseTo(3.2, 10);
    });

    it('should calculate expected points for hardest fixture', () => {
      const player: Partial<Player> = {
        id: 3,
        web_name: 'Haaland',
        team: 1,
        form: '9.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 5, // Hardest fixture
          team_a_difficulty: 1,
        } as Fixture,
      ];

      // fixtureScore = 5 - 5 = 0
      // formScore = 9.0
      // expected = (0.7 * 0) + (0.3 * 9.0) = 0 + 2.7 = 2.7
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBeCloseTo(2.7, 10);
    });

    it('should calculate expected points for easiest fixture', () => {
      const player: Partial<Player> = {
        id: 4,
        web_name: 'Bruno',
        team: 1,
        form: '5.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 1, // Easiest fixture
          team_a_difficulty: 5,
        } as Fixture,
      ];

      // fixtureScore = 5 - 1 = 4
      // formScore = 5.0
      // expected = (0.7 * 4) + (0.3 * 5.0) = 2.8 + 1.5 = 4.3
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(4.3);
    });
  });

  describe('edge cases', () => {
    it('should return 0 when player has no upcoming fixture', () => {
      const player: Partial<Player> = {
        id: 5,
        web_name: 'Son',
        team: 3,
        form: '8.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(0);
    });

    it('should return 0 when fixtures array is empty', () => {
      const player: Partial<Player> = {
        id: 6,
        web_name: 'Saka',
        team: 1,
        form: '7.0',
        status: 'a',
      };

      const result = calculateExpectedPoints(player as Player, [], mockTeams);

      expect(result).toBe(0);
    });

    it('should treat empty form string as 0', () => {
      const player: Partial<Player> = {
        id: 7,
        web_name: 'Rashford',
        team: 1,
        form: '', // Empty form
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
      ];

      // fixtureScore = 5 - 2 = 3
      // formScore = 0 (empty string)
      // expected = (0.7 * 3) + (0.3 * 0) = 2.1 + 0 = 2.1
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBeCloseTo(2.1, 10);
    });

    it('should return 0 when player status is injured (i)', () => {
      const player: Partial<Player> = {
        id: 8,
        web_name: 'Sterling',
        team: 1,
        form: '6.5',
        status: 'i', // Injured
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(0);
    });

    it('should return 0 when player status is doubtful (d)', () => {
      const player: Partial<Player> = {
        id: 9,
        web_name: 'Foden',
        team: 1,
        form: '8.0',
        status: 'd', // Doubtful
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(0);
    });

    it('should return 0 when player status is unavailable (u)', () => {
      const player: Partial<Player> = {
        id: 10,
        web_name: 'Grealish',
        team: 1,
        form: '5.5',
        status: 'u', // Unavailable
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(0);
    });

    it('should handle player with zero form', () => {
      const player: Partial<Player> = {
        id: 11,
        web_name: 'Mount',
        team: 1,
        form: '0.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      // fixtureScore = 5 - 3 = 2
      // formScore = 0.0
      // expected = (0.7 * 2) + (0.3 * 0) = 1.4 + 0 = 1.4
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(1.4);
    });

    it('should handle player with very high form', () => {
      const player: Partial<Player> = {
        id: 12,
        web_name: 'Haaland',
        team: 1,
        form: '15.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      // fixtureScore = 5 - 3 = 2
      // formScore = 15.0
      // expected = (0.7 * 2) + (0.3 * 15.0) = 1.4 + 4.5 = 5.9
      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      expect(result).toBe(5.9);
    });
  });

  describe('double gameweeks', () => {
    it('sums xP across both fixtures when a player has two', () => {
      const player: Partial<Player> = {
        id: 99,
        web_name: 'DGWPlayer',
        team: 1,
        form: '6.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        // Home fixture, easy
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
        // Away fixture, hard
        {
          id: 2,
          event: 1,
          team_h: 3,
          team_a: 1,
          team_h_difficulty: 2,
          team_a_difficulty: 5,
        } as Fixture,
      ];

      // Fixture 1: 0.7×3 + 0.3×6 = 2.1 + 1.8 = 3.9
      // Fixture 2: 0.7×0 + 0.3×6 = 0   + 1.8 = 1.8
      // Total = 5.7
      const result = calculateExpectedPoints(player as Player, fixtures, mockTeams);
      expect(result).toBeCloseTo(5.7, 10);
    });
  });

  describe('fixture matching', () => {
    it('should correctly identify home fixture for player', () => {
      const player: Partial<Player> = {
        id: 13,
        web_name: 'Salah',
        team: 1,
        form: '8.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1, // Player's team is home
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      // Should use team_h_difficulty = 2
      // fixtureScore = 5 - 2 = 3
      // formScore = 8.0
      // expected = (0.7 * 3) + (0.3 * 8.0) = 2.1 + 2.4 = 4.5
      expect(result).toBe(4.5);
    });

    it('should correctly identify away fixture for player', () => {
      const player: Partial<Player> = {
        id: 14,
        web_name: 'Kane',
        team: 2,
        form: '7.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2, // Player's team is away
          team_h_difficulty: 4,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      // Should use team_a_difficulty = 3
      // fixtureScore = 5 - 3 = 2
      // formScore = 7.0
      // expected = (0.7 * 2) + (0.3 * 7.0) = 1.4 + 2.1 = 3.5
      expect(result).toBe(3.5);
    });

    it('should find correct fixture among multiple fixtures', () => {
      const player: Partial<Player> = {
        id: 15,
        web_name: 'Fernandes',
        team: 3,
        form: '6.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 2,
          team_a_difficulty: 4,
        } as Fixture,
        {
          id: 2,
          event: 1,
          team_h: 3, // Player's team
          team_a: 4,
          team_h_difficulty: 3,
          team_a_difficulty: 2,
        } as Fixture,
        {
          id: 3,
          event: 1,
          team_h: 5,
          team_a: 6,
          team_h_difficulty: 4,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      const result = calculateExpectedPoints(
        player as Player,
        fixtures,
        mockTeams
      );

      // Should use fixture id=2, team_h_difficulty = 3
      // fixtureScore = 5 - 3 = 2
      // formScore = 6.0
      // expected = (0.7 * 2) + (0.3 * 6.0) = 1.4 + 1.8 = 3.2
      expect(result).toBeCloseTo(3.2, 10);
    });
  });
});
