/**
 * ILP solver unit tests
 * 
 * Tests with small fixed dataset (20 players) covering:
 * - Feasible lineup generation
 * - Infeasible scenario handling
 * - Budget constraint
 * - Position constraints
 * - Team limit constraints
 */

import { describe, test, expect } from 'vitest';
import { solveLineup, type Formation } from '../../lib/optimizer/ilp-solver';
import type { Player } from '../../lib/types/fpl';

// Test formation (4-4-2)
const TEST_FORMATION: Formation = {
  gk: 1,
  def: 4,
  mid: 4,
  fwd: 2,
};

// Helper to create a test player
function createPlayer(
  id: number,
  element_type: number,
  team: number,
  now_cost: number,
  web_name: string = `Player${id}`
): Player {
  return {
    id,
    web_name,
    team,
    element_type,
    now_cost,
    form: '5.0',
    points_per_game: '5.0',
    total_points: 50,
    selected_by_percent: '10.0',
    status: 'a',
    // Other required Player fields with defaults
    code: id,
    first_name: 'Test',
    second_name: web_name,
    squad_number: null,
    news: '',
    news_added: null,
    chance_of_playing_this_round: null,
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
    loans_in: 0,
    loans_out: 0,
    loaned_in: 0,
    loaned_out: 0,
    ep_this: null,
    ep_next: null,
    special: false,
    minutes: 0,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps: 0,
    influence: '0.0',
    creativity: '0.0',
    threat: '0.0',
    ict_index: '0.0',
    starts: 0,
    expected_goals: '0.0',
    expected_assists: '0.0',
    expected_goal_involvements: '0.0',
    expected_goals_conceded: '0.0',
    influence_rank: 1,
    influence_rank_type: 1,
    creativity_rank: 1,
    creativity_rank_type: 1,
    threat_rank: 1,
    threat_rank_type: 1,
    ict_index_rank: 1,
    ict_index_rank_type: 1,
    corners_and_indirect_freekicks_order: null,
    corners_and_indirect_freekicks_text: '',
    direct_freekicks_order: null,
    direct_freekicks_text: '',
    penalties_order: null,
    penalties_text: '',
    expected_goals_per_90: 0,
    saves_per_90: 0,
    expected_assists_per_90: 0,
    expected_goal_involvements_per_90: 0,
    expected_goals_conceded_per_90: 0,
    goals_conceded_per_90: 0,
    now_cost_rank: 1,
    now_cost_rank_type: 1,
    form_rank: 1,
    form_rank_type: 1,
    points_per_game_rank: 1,
    points_per_game_rank_type: 1,
    selected_rank_type_: 1,
    starts_per_90: 0,
    clean_sheets_per_90: 0,
  } as Player;
}

// Create 24-player dataset spread across 4 teams
// Team 1: 1 GK, 3 DEF, 3 MID, 1 FWD (8 players, max 3 selected)
// Team 2: 1 GK, 3 DEF, 3 MID, 1 FWD (8 players, max 3 selected)
// Team 3: 2 DEF, 2 MID (4 players, max 3 selected)
// Team 4: 2 DEF, 2 MID (4 players, max 3 selected)
// Valid lineup: max 3 from each team = 11 players possible
const TEST_PLAYERS: Player[] = [
  // Team 1 - 8 players
  createPlayer(1, 1, 1, 45, 'GK_T1'),
  createPlayer(2, 2, 1, 50, 'DEF1_T1'),
  createPlayer(3, 2, 1, 55, 'DEF2_T1'),
  createPlayer(4, 2, 1, 60, 'DEF3_T1'),
  createPlayer(5, 3, 1, 60, 'MID1_T1'),
  createPlayer(6, 3, 1, 70, 'MID2_T1'),
  createPlayer(7, 3, 1, 80, 'MID3_T1'),
  createPlayer(8, 4, 1, 90, 'FWD1_T1'),
  
  // Team 2 - 8 players
  createPlayer(9, 1, 2, 50, 'GK_T2'),
  createPlayer(10, 2, 2, 50, 'DEF1_T2'),
  createPlayer(11, 2, 2, 55, 'DEF2_T2'),
  createPlayer(12, 2, 2, 60, 'DEF3_T2'),
  createPlayer(13, 3, 2, 60, 'MID1_T2'),
  createPlayer(14, 3, 2, 70, 'MID2_T2'),
  createPlayer(15, 3, 2, 80, 'MID3_T2'),
  createPlayer(16, 4, 2, 95, 'FWD1_T2'),
  
  // Team 3 - 4 players
  createPlayer(17, 2, 3, 50, 'DEF1_T3'),
  createPlayer(18, 2, 3, 55, 'DEF2_T3'),
  createPlayer(19, 3, 3, 60, 'MID1_T3'),
  createPlayer(20, 3, 3, 70, 'MID2_T3'),
  
  // Team 4 - 4 players
  createPlayer(21, 2, 4, 50, 'DEF1_T4'),
  createPlayer(22, 2, 4, 55, 'DEF2_T4'),
  createPlayer(23, 4, 4, 85, 'FWD1_T4'),
  createPlayer(24, 4, 4, 90, 'FWD2_T4'),
];

// Expected points map: higher for expensive players
const TEST_EXPECTED_POINTS = new Map<number, number>([
  // Team 1
  [1, 3.5],   // GK_T1
  [2, 4.5],   // DEF1_T1
  [3, 5.0],   // DEF2_T1
  [4, 5.5],   // DEF3_T1
  [5, 6.0],   // MID1_T1
  [6, 7.0],   // MID2_T1
  [7, 8.0],   // MID3_T1
  [8, 9.0],   // FWD1_T1
  // Team 2
  [9, 4.0],   // GK_T2
  [10, 4.5],  // DEF1_T2
  [11, 5.0],  // DEF2_T2
  [12, 5.5],  // DEF3_T2
  [13, 6.0],  // MID1_T2
  [14, 7.0],  // MID2_T2
  [15, 8.0],  // MID3_T2
  [16, 9.5],  // FWD1_T2 (best expected points)
  // Team 3
  [17, 4.5],  // DEF1_T3
  [18, 5.0],  // DEF2_T3
  [19, 6.0],  // MID1_T3
  [20, 7.0],  // MID2_T3
  // Team 4
  [21, 4.5],  // DEF1_T4
  [22, 5.0],  // DEF2_T4
  [23, 8.5],  // FWD1_T4
  [24, 9.0],  // FWD2_T4
]);

describe('solveLineup', () => {
  test('returns valid lineup for feasible scenario', () => {
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, TEST_EXPECTED_POINTS);
    
    expect(result).not.toBeNull();
    expect(result!.players).toHaveLength(11);
    
    // Check position counts
    const positionCounts = result!.players.reduce(
      (acc, p) => {
        acc[p.element_type] = (acc[p.element_type] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
    
    expect(positionCounts[1]).toBe(1); // 1 GK
    expect(positionCounts[2]).toBe(4); // 4 DEF
    expect(positionCounts[3]).toBe(4); // 4 MID
    expect(positionCounts[4]).toBe(2); // 2 FWD
  });

  test('respects budget constraint (£100m)', () => {
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, TEST_EXPECTED_POINTS);
    
    expect(result).not.toBeNull();
    expect(result!.totalCost).toBeLessThanOrEqual(1000); // £100m in £0.1m units
  });

  test('respects team limit (max 3 per team)', () => {
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, TEST_EXPECTED_POINTS);
    
    expect(result).not.toBeNull();
    
    // Count players per team
    const teamCounts = result!.players.reduce(
      (acc, p) => {
        acc[p.team] = (acc[p.team] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
    
    // No team should have more than 3 players
    for (const count of Object.values(teamCounts)) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  test('selects captain with highest expected points', () => {
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, TEST_EXPECTED_POINTS);
    
    expect(result).not.toBeNull();
    expect(result!.captain).not.toBeNull();

    // Captain should be one of the selected players
    expect(result!.players).toContainEqual(result!.captain);

    // Captain should have highest expected points among selected
    const captainPoints = TEST_EXPECTED_POINTS.get(result!.captain!.id) ?? 0;
    for (const player of result!.players) {
      const playerPoints = TEST_EXPECTED_POINTS.get(player.id) ?? 0;
      expect(captainPoints).toBeGreaterThanOrEqual(playerPoints);
    }
  });

  test('returns null for infeasible scenario (insufficient defenders)', () => {
    // Create dataset with only 2 defenders (need 4 for 4-4-2)
    const infeasiblePlayers: Player[] = [
      createPlayer(1, 1, 1, 45, 'GK1'),
      createPlayer(2, 2, 1, 50, 'DEF1'),
      createPlayer(3, 2, 1, 50, 'DEF2'),
      // Only 2 defenders!
      createPlayer(4, 3, 1, 60, 'MID1'),
      createPlayer(5, 3, 1, 60, 'MID2'),
      createPlayer(6, 3, 1, 60, 'MID3'),
      createPlayer(7, 3, 1, 60, 'MID4'),
      createPlayer(8, 4, 1, 80, 'FWD1'),
      createPlayer(9, 4, 1, 80, 'FWD2'),
    ];
    
    const infeasiblePoints = new Map<number, number>(
      infeasiblePlayers.map(p => [p.id, 5.0])
    );
    
    const result = solveLineup(infeasiblePlayers, TEST_FORMATION, infeasiblePoints);
    
    expect(result).toBeNull();
  });

  test('returns null for infeasible scenario (budget too tight)', () => {
    // Create expensive players that exceed £100m budget
    const expensivePlayers: Player[] = [
      createPlayer(1, 1, 1, 60, 'GK1'),
      createPlayer(2, 2, 1, 120, 'DEF1'),
      createPlayer(3, 2, 2, 120, 'DEF2'),
      createPlayer(4, 2, 3, 120, 'DEF3'),
      createPlayer(5, 2, 4, 120, 'DEF4'),
      createPlayer(6, 3, 5, 120, 'MID1'),
      createPlayer(7, 3, 6, 120, 'MID2'),
      createPlayer(8, 3, 7, 120, 'MID3'),
      createPlayer(9, 3, 8, 120, 'MID4'),
      createPlayer(10, 4, 9, 120, 'FWD1'),
      createPlayer(11, 4, 10, 120, 'FWD2'),
    ];
    
    const expensivePoints = new Map<number, number>(
      expensivePlayers.map(p => [p.id, 8.0])
    );
    
    const result = solveLineup(expensivePlayers, TEST_FORMATION, expensivePoints);
    
    // Total cost would be 60 + (10 * 120) = 1260, exceeds 1000 limit
    expect(result).toBeNull();
  });

  test('logs solve time and feasibility status', () => {
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, TEST_EXPECTED_POINTS);
    
    expect(result).not.toBeNull();
    expect(result!.solveTimeMs).toBeGreaterThan(0);
    expect(result!.solveTimeMs).toBeLessThan(10000); // Should complete well under 10s timeout
  });

  test('handles empty expected points map gracefully', () => {
    const emptyPoints = new Map<number, number>();
    
    const result = solveLineup(TEST_PLAYERS, TEST_FORMATION, emptyPoints);
    
    // Should still find a valid lineup (with all points = 0)
    expect(result).not.toBeNull();
    expect(result!.players).toHaveLength(11);
    expect(result!.totalExpectedPoints).toBe(0);
  });
});
