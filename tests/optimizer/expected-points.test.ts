/**
 * Tests for expected points calculation.
 *
 * Formula: xP = (0.5 × ppg + 0.5 × form) × (1 + (3 − difficulty) × 0.25)
 * Tests set points_per_game equal to form so baseScore = form, keeping
 * expectations easy to verify. The ppg/form blend is covered in a dedicated suite.
 */

import { describe, it, expect } from 'vitest';
import { calculateExpectedPoints } from '../../lib/optimizer/expected-points';
import type { Player, Fixture, Team } from '../../lib/types/fpl';

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
  describe('multiplicative fixture weighting', () => {
    it('easy fixture boosts above base (difficulty 2 → ×1.25)', () => {
      const player: Partial<Player> = {
        id: 1,
        web_name: 'Salah',
        team: 1,
        form: '7.5',
        points_per_game: '7.5',
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

      // baseScore = 0.5×7.5 + 0.5×7.5 = 7.5
      // multiplier = 1 + (3-2)×0.25 = 1.25
      // xP = 7.5 × 1.25 = 9.375
      const result = calculateExpectedPoints(player as Player, fixtures, mockTeams);
      expect(result).toBeCloseTo(9.375, 10);
    });

    it('average fixture is neutral (difficulty 3 → ×1.0)', () => {
      const player: Partial<Player> = {
        id: 2,
        web_name: 'Kane',
        team: 2,
        form: '6.0',
        points_per_game: '6.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 4,
          team_a_difficulty: 3,
        } as Fixture,
      ];

      // baseScore = 6.0, multiplier = 1.0, xP = 6.0
      const result = calculateExpectedPoints(player as Player, fixtures, mockTeams);
      expect(result).toBeCloseTo(6.0, 10);
    });

    it('hardest fixture halves expected output (difficulty 5 → ×0.5)', () => {
      const player: Partial<Player> = {
        id: 3,
        web_name: 'Haaland',
        team: 1,
        form: '9.0',
        points_per_game: '9.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 5,
          team_a_difficulty: 1,
        } as Fixture,
      ];

      // baseScore = 9.0, multiplier = 1 + (3-5)×0.25 = 0.5, xP = 4.5
      const result = calculateExpectedPoints(player as Player, fixtures, mockTeams);
      expect(result).toBeCloseTo(4.5, 10);
    });

    it('easiest fixture gives 1.5× boost (difficulty 1 → ×1.5)', () => {
      const player: Partial<Player> = {
        id: 4,
        web_name: 'Bruno',
        team: 1,
        form: '5.0',
        points_per_game: '5.0',
        status: 'a',
      };

      const fixtures: Fixture[] = [
        {
          id: 1,
          event: 1,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 1,
          team_a_difficulty: 5,
        } as Fixture,
      ];

      // baseScore = 5.0, multiplier = 1 + (3-1)×0.25 = 1.5, xP = 7.5
      const result = calculateExpectedPoints(player as Player, fixtures, mockTeams);
      expect(result).toBeCloseTo(7.5, 10);
    });

    it('elite form beats modest form even at harder fixture', () => {
      // Haaland (form=9, difficulty=4) vs budget fwd (form=3, difficulty=1)
      // Haaland: 9 × (1+(3-4)×0.25) = 9 × 0.75 = 6.75
      // Budget:  3 × 1.5 = 4.5
      // Captain-worthy player should score higher even at a harder fixture.
      const haaland: Partial<Player> = {
        id: 1, team: 1, form: '9.0', points_per_game: '9.0', status: 'a', web_name: 'Haaland',
      };
      const budget: Partial<Player> = {
        id: 2, team: 2, form: '3.0', points_per_game: '3.0', status: 'a', web_name: 'BudgetFwd',
      };
      const haalandFixture: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 3, team_h_difficulty: 4, team_a_difficulty: 2 } as Fixture,
      ];
      const budgetFixture: Fixture[] = [
        { id: 2, event: 1, team_h: 2, team_a: 4, team_h_difficulty: 1, team_a_difficulty: 3 } as Fixture,
      ];

      const haalandXp = calculateExpectedPoints(haaland as Player, haalandFixture, mockTeams);
      const budgetXp = calculateExpectedPoints(budget as Player, budgetFixture, mockTeams);
      expect(haalandXp).toBeCloseTo(6.75, 10);
      expect(budgetXp).toBeCloseTo(4.5, 10);
      expect(haalandXp).toBeGreaterThan(budgetXp);
    });
  });

  describe('ppg / form blend', () => {
    it('blends ppg and form equally when they differ', () => {
      // ppg=8, form=4 → baseScore=6; difficulty=3 → ×1.0; xP=6
      const player: Partial<Player> = {
        id: 1, team: 1, form: '4.0', points_per_game: '8.0', status: 'a', web_name: 'Test',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(6.0, 10);
    });

    it('falls back gracefully when points_per_game is missing', () => {
      // Only form available → baseScore = 0.5×form
      const player: Partial<Player> = {
        id: 1, team: 1, form: '6.0', status: 'a', web_name: 'Test',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture,
      ];
      // baseScore = 0.5×0 + 0.5×6 = 3; multiplier = 1.0; xP = 3
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(3.0, 10);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when player has no upcoming fixture', () => {
      const player: Partial<Player> = {
        id: 5, web_name: 'Son', team: 3, form: '8.0', points_per_game: '8.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('returns 0 when fixtures array is empty', () => {
      const player: Partial<Player> = {
        id: 6, web_name: 'Saka', team: 1, form: '7.0', points_per_game: '7.0', status: 'a',
      };
      expect(calculateExpectedPoints(player as Player, [], mockTeams)).toBe(0);
    });

    it('returns 0 when form and ppg are both zero or empty', () => {
      const player: Partial<Player> = {
        id: 7, web_name: 'Rashford', team: 1, form: '', points_per_game: '', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('returns 0 when player status is injured (i)', () => {
      const player: Partial<Player> = {
        id: 8, web_name: 'Sterling', team: 1, form: '6.5', points_per_game: '6.5', status: 'i',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('returns 0 when player status is doubtful (d)', () => {
      const player: Partial<Player> = {
        id: 9, web_name: 'Foden', team: 1, form: '8.0', points_per_game: '8.0', status: 'd',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('returns 0 when player status is unavailable (u)', () => {
      const player: Partial<Player> = {
        id: 10, web_name: 'Grealish', team: 1, form: '5.5', points_per_game: '5.5', status: 'u',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('handles player with zero form and zero ppg', () => {
      const player: Partial<Player> = {
        id: 11, web_name: 'Mount', team: 1, form: '0.0', points_per_game: '0.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture,
      ];
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBe(0);
    });

    it('handles player with very high form', () => {
      const player: Partial<Player> = {
        id: 12, web_name: 'Haaland', team: 1, form: '15.0', points_per_game: '15.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture,
      ];
      // baseScore = 15, multiplier = 1.0, xP = 15
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(15.0, 10);
    });
  });

  describe('double gameweeks', () => {
    it('sums xP across both fixtures', () => {
      const player: Partial<Player> = {
        id: 99, web_name: 'DGWPlayer', team: 1, form: '6.0', points_per_game: '6.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        // Home fixture, easy (difficulty 2)
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
        // Away fixture, hard (difficulty 5)
        { id: 2, event: 1, team_h: 3, team_a: 1, team_h_difficulty: 2, team_a_difficulty: 5 } as Fixture,
      ];

      // Fixture 1: 6 × (1+(3-2)×0.25) = 6 × 1.25 = 7.5
      // Fixture 2: 6 × (1+(3-5)×0.25) = 6 × 0.5  = 3.0
      // Total = 10.5
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(10.5, 10);
    });
  });

  describe('fixture matching', () => {
    it('correctly identifies home fixture for player', () => {
      const player: Partial<Player> = {
        id: 13, web_name: 'Salah', team: 1, form: '8.0', points_per_game: '8.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
      ];
      // Uses team_h_difficulty=2; 8 × 1.25 = 10.0
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(10.0, 10);
    });

    it('correctly identifies away fixture for player', () => {
      const player: Partial<Player> = {
        id: 14, web_name: 'Kane', team: 2, form: '7.0', points_per_game: '7.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 4, team_a_difficulty: 3 } as Fixture,
      ];
      // Uses team_a_difficulty=3; 7 × 1.0 = 7.0
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(7.0, 10);
    });

    it('finds correct fixture among multiple fixtures', () => {
      const player: Partial<Player> = {
        id: 15, web_name: 'Fernandes', team: 3, form: '6.0', points_per_game: '6.0', status: 'a',
      };
      const fixtures: Fixture[] = [
        { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 } as Fixture,
        { id: 2, event: 1, team_h: 3, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 2 } as Fixture,
        { id: 3, event: 1, team_h: 5, team_a: 6, team_h_difficulty: 4, team_a_difficulty: 3 } as Fixture,
      ];
      // Matches fixture 2, team_h_difficulty=3; 6 × 1.0 = 6.0
      expect(calculateExpectedPoints(player as Player, fixtures, mockTeams)).toBeCloseTo(6.0, 10);
    });
  });
});
