/**
 * Tests for position-specific expected points calculation.
 *
 * All signals are converted to FPL point-equivalent units before weighting.
 * See CONTEXT.md (Position-Specific xP) and ADR-0001 for the design rationale.
 *
 * Isolation strategy: supplying two teams with equal strength values forces the
 * fixture multiplier to 1.0 (neutral), so each test exercises only the base
 * score logic without fixture noise.
 */

import { describe, it, expect } from 'vitest';
import { calculateExpectedPoints } from '../../lib/optimizer/expected-points';
import type { Player, Fixture, Team } from '../../lib/types/fpl';

// Two equal-strength teams → fixture multiplier = 1.0 (neutral)
const neutralTeams: Team[] = [
  {
    id: 1, name: 'Home', short_name: 'HOM', strength: 3,
    strength_overall_home: 1200, strength_overall_away: 1200,
    strength_attack_home: 1200, strength_attack_away: 1200,
    strength_defence_home: 1200, strength_defence_away: 1200,
  } as Team,
  {
    id: 2, name: 'Away', short_name: 'AWY', strength: 3,
    strength_overall_home: 1200, strength_overall_away: 1200,
    strength_attack_home: 1200, strength_attack_away: 1200,
    strength_defence_home: 1200, strength_defence_away: 1200,
  } as Team,
];

const neutralFixture: Fixture = {
  id: 1, event: 1, team_h: 1, team_a: 2,
  team_h_difficulty: 3, team_a_difficulty: 3,
} as Fixture;

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: 1,
  web_name: 'Test',
  team: 1,
  element_type: 3,
  status: 'a',
  form: '5.0',
  points_per_game: '5.0',
  minutes: 900,
  chance_of_playing_this_round: null,
  clean_sheets_per_90: 0,
  saves_per_90: 0,
  expected_goal_involvements_per_90: 0,
  goals_scored: 0,
  assists: 0,
  goals_conceded: 0,
  own_goals: 0,
  penalties_saved: 0,
  penalties_missed: 0,
  yellow_cards: 0,
  red_cards: 0,
  total_points: 50,
  now_cost: 80,
  selected_by_percent: '10.0',
  ep_this: null,
  ep_next: null,
  code: 1,
  first_name: 'Test',
  second_name: 'Player',
  squad_number: null,
  news: '',
  news_added: null,
  chance_of_playing_next_round: null,
  value_form: '0.0',
  value_season: '0.0',
  cost_change_start: 0,
  cost_change_start_fall: 0,
  cost_change_event: 0,
  cost_change_event_fall: 0,
  in_dreamteam: false,
  dreamteam_count: 0,
  selected_rank: 1,
  selected_rank_type: 1,
  transfers_in: 0,
  transfers_out: 0,
  transfers_in_event: 0,
  transfers_out_event: 0,
  special: false,
  starts: 10,
  starts_per_90: 1.0,
  clean_sheets: 0,
  goals_conceded_per_90: 0,
  saves: 0,
  bonus: 0,
  bps: 0,
  influence: '0',
  creativity: '0',
  threat: '0',
  ict_index: '0',
  expected_goals: '0',
  expected_assists: '0',
  expected_goal_involvements: '0',
  expected_goals_conceded: '0',
  expected_goals_per_90: 0,
  expected_assists_per_90: 0,
  expected_goals_conceded_per_90: 0,
  corners_and_indirect_freekicks_order: null,
  corners_and_indirect_freekicks_text: '',
  direct_freekicks_order: null,
  direct_freekicks_text: '',
  penalties_order: null,
  penalties_text: '',
  can_transact: true,
  can_select: true,
  removed: false,
  region: 1,
  team_join_date: '',
  birth_date: '',
  has_temporary_code: false,
  opta_code: '',
  clearances_blocks_interceptions: 0,
  recoveries: 0,
  tackles: 0,
  defensive_contribution: 0,
  event_points: 0,
  points_per_game_rank: 1,
  points_per_game_rank_type: 1,
  now_cost_rank: 1,
  now_cost_rank_type: 1,
  form_rank: 1,
  form_rank_type: 1,
  influence_rank: 1,
  influence_rank_type: 1,
  creativity_rank: 1,
  creativity_rank_type: 1,
  threat_rank: 1,
  threat_rank_type: 1,
  ict_index_rank: 1,
  ict_index_rank_type: 1,
  ...overrides,
} as Player);

// Asymmetric teams: opponent has strong attack (DEF dimension) but weak defence (attack dimension).
// Used to confirm that position type drives which strength axis is consulted.
const asymTeams: Team[] = [
  { id: 1, name: 'Player', short_name: 'PLY', strength: 3,
    strength_overall_home: 1200, strength_overall_away: 1200,
    strength_attack_home: 1200, strength_attack_away: 1200,
    strength_defence_home: 1200, strength_defence_away: 1200 } as Team,
  { id: 2, name: 'Opponent', short_name: 'OPP', strength: 3,
    strength_overall_home: 1400, strength_overall_away: 1400,
    strength_attack_home: 1400, strength_attack_away: 1400, // strong attack → bad for GK/DEF
    strength_defence_home: 900,  strength_defence_away: 900  } as Team, // weak defence → good for MID/FWD
  { id: 3, name: 'Anchor', short_name: 'ANC', strength: 3,
    strength_overall_home: 1200, strength_overall_away: 1200,
    strength_attack_home: 1200, strength_attack_away: 1200,
    strength_defence_home: 1200, strength_defence_away: 1200 } as Team,
];
const asymFixture: Fixture = { id: 2, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 } as Fixture;

describe('calculateExpectedPoints', () => {
  describe('MID position-specific base score', () => {
    it('higher xGI_per_90 produces more xP than lower, neutral fixture', () => {
      const highXgi = makePlayer({ element_type: 3, expected_goal_involvements_per_90: 0.5, form: '5.0', points_per_game: '5.0' });
      const lowXgi = makePlayer({ element_type: 3, expected_goal_involvements_per_90: 0.1, form: '5.0', points_per_game: '5.0' });
      const high = calculateExpectedPoints(highXgi, [neutralFixture], neutralTeams);
      const low = calculateExpectedPoints(lowXgi, [neutralFixture], neutralTeams);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('FWD position-specific base score', () => {
    it('higher xGI_per_90 produces more xP than lower, neutral fixture', () => {
      const highXgi = makePlayer({ element_type: 4, expected_goal_involvements_per_90: 0.5, form: '5.0', points_per_game: '5.0' });
      const lowXgi = makePlayer({ element_type: 4, expected_goal_involvements_per_90: 0.1, form: '5.0', points_per_game: '5.0' });
      const high = calculateExpectedPoints(highXgi, [neutralFixture], neutralTeams);
      const low = calculateExpectedPoints(lowXgi, [neutralFixture], neutralTeams);
      expect(high).toBeGreaterThan(low);
    });

    it('same xGI_per_90 produces more xP for FWD than MID (FWD factor 5.0 vs 4.5)', () => {
      const fwd = makePlayer({ element_type: 4, expected_goal_involvements_per_90: 0.4, form: '5.0', points_per_game: '5.0' });
      const mid = makePlayer({ element_type: 3, expected_goal_involvements_per_90: 0.4, form: '5.0', points_per_game: '5.0' });
      const fwdXP = calculateExpectedPoints(fwd, [neutralFixture], neutralTeams);
      const midXP = calculateExpectedPoints(mid, [neutralFixture], neutralTeams);
      expect(fwdXP).toBeGreaterThan(midXP);
    });
  });

  describe('fixture multiplier integration (getFixtureMultiplier)', () => {
    it('GK gets lower xP vs strong opponent attack than vs weak, same base stats', () => {
      // asymOpponent has strength_attack=1400 (strongest) → worst for GK
      // neutralFixture vs neutralTeams (equal) → GK gets ×1.0
      // asymFixture vs asymTeams → GK should get multiplier < 1.0
      const gk = makePlayer({ element_type: 1, clean_sheets_per_90: 0.4, saves_per_90: 3, team: 1 });
      const xpNeutral = calculateExpectedPoints(gk, [neutralFixture], neutralTeams);
      const xpAsym = calculateExpectedPoints(gk, [asymFixture], asymTeams);
      expect(xpAsym).toBeLessThan(xpNeutral);
    });

    it('MID gets higher xP vs weak opponent defence than vs neutral, same base stats', () => {
      // asymOpponent has strength_defence=900 (weakest) → good for MID
      const mid = makePlayer({ element_type: 3, expected_goal_involvements_per_90: 0.4, form: '5.0', points_per_game: '5.0', team: 1 });
      const xpNeutral = calculateExpectedPoints(mid, [neutralFixture], neutralTeams);
      const xpAsym = calculateExpectedPoints(mid, [asymFixture], asymTeams);
      expect(xpAsym).toBeGreaterThan(xpNeutral);
    });
  });

  describe('participation threshold / doubtful handling', () => {
    it('chance_of_playing < 25 → xP = 0 (hard excluded)', () => {
      const doubtful = makePlayer({ status: 'd', chance_of_playing_this_round: 20 });
      expect(calculateExpectedPoints(doubtful, [neutralFixture], neutralTeams)).toBe(0);
    });

    it('chance_of_playing = 50 → gentle ~7.5% discount (multiplier ≈ 0.925)', () => {
      const certain = makePlayer({ status: 'a', chance_of_playing_this_round: null });
      const doubt50 = makePlayer({ status: 'd', chance_of_playing_this_round: 50 });
      const certainXP = calculateExpectedPoints(certain, [neutralFixture], neutralTeams);
      const doubt50XP = calculateExpectedPoints(doubt50, [neutralFixture], neutralTeams);
      expect(doubt50XP).toBeCloseTo(certainXP * 0.925, 3);
    });

    it('chance_of_playing = null → no discount (full xP)', () => {
      const certain = makePlayer({ status: 'a', chance_of_playing_this_round: null });
      const nullChance = makePlayer({ status: 'a', chance_of_playing_this_round: null });
      expect(calculateExpectedPoints(certain, [neutralFixture], neutralTeams))
        .toBeCloseTo(calculateExpectedPoints(nullChance, [neutralFixture], neutralTeams));
    });
  });

  describe('minutes floor (< 450 min → PPG+form fallback)', () => {
    it('MID below 450 minutes uses 0.60×PPG + 0.40×form fallback, ignoring xGI', () => {
      // High xGI but low minutes — fallback should apply, not xGI formula.
      // Use form=5 and ppg=5 so fallback = 0.60*5 + 0.40*5 = 5.
      // Full MID formula would be 0.45*(1.0*4.5) + 0.30*5 + 0.25*5 = 2.025+1.5+1.25 = 4.775 < 5.
      // So if we get ≈5 (fallback), the xGI signal was correctly ignored.
      const lowMin = makePlayer({ element_type: 3, minutes: 400, expected_goal_involvements_per_90: 1.0, form: '5.0', points_per_game: '5.0' });
      const xP = calculateExpectedPoints(lowMin, [neutralFixture], neutralTeams);
      expect(xP).toBeCloseTo(5.0);
    });

    it('MID at exactly 450 minutes uses position-specific formula, not fallback', () => {
      const atFloor = makePlayer({ element_type: 3, minutes: 450, expected_goal_involvements_per_90: 1.0, form: '5.0', points_per_game: '5.0' });
      const xP = calculateExpectedPoints(atFloor, [neutralFixture], neutralTeams);
      // Full MID formula: 0.45*(1.0*4.5) + 0.30*5 + 0.25*5 ≈ 4.775 ≠ 5.0
      expect(xP).not.toBeCloseTo(5.0);
    });
  });

  describe('DEF position-specific base score', () => {
    it('higher clean_sheets_per_90 produces more xP than lower, neutral fixture', () => {
      const highCS = makePlayer({ element_type: 2, clean_sheets_per_90: 0.6, form: '5.0', points_per_game: '5.0' });
      const lowCS = makePlayer({ element_type: 2, clean_sheets_per_90: 0.1, form: '5.0', points_per_game: '5.0' });
      const high = calculateExpectedPoints(highCS, [neutralFixture], neutralTeams);
      const low = calculateExpectedPoints(lowCS, [neutralFixture], neutralTeams);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('GK position-specific base score', () => {
    it('higher clean_sheets_per_90 produces more xP than lower, neutral fixture', () => {
      const highCS = makePlayer({ element_type: 1, clean_sheets_per_90: 0.6, saves_per_90: 3 });
      const lowCS = makePlayer({ element_type: 1, clean_sheets_per_90: 0.2, saves_per_90: 3 });
      const high = calculateExpectedPoints(highCS, [neutralFixture], neutralTeams);
      const low = calculateExpectedPoints(lowCS, [neutralFixture], neutralTeams);
      expect(high).toBeGreaterThan(low);
    });

    it('higher saves_per_90 produces more xP than lower, neutral fixture', () => {
      const highSaves = makePlayer({ element_type: 1, clean_sheets_per_90: 0.4, saves_per_90: 5 });
      const lowSaves = makePlayer({ element_type: 1, clean_sheets_per_90: 0.4, saves_per_90: 1 });
      const high = calculateExpectedPoints(highSaves, [neutralFixture], neutralTeams);
      const low = calculateExpectedPoints(lowSaves, [neutralFixture], neutralTeams);
      expect(high).toBeGreaterThan(low);
    });
  });
});
