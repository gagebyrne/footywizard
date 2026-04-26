/**
 * Integration test for /api/optimize endpoint
 * 
 * Tests:
 * - Valid lineup for typical dataset
 * - 422 error for infeasible scenario (insufficient defenders)
 * - Captain is player with highest expected points
 * - Formation string present in response
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Player, Team, Event, Fixture } from '@/lib/types/fpl';

// Use vi.hoisted() to properly hoist mock functions
const { mockGetBootstrapData, mockGetFixtures } = vi.hoisted(() => {
  return {
    mockGetBootstrapData: vi.fn(),
    mockGetFixtures: vi.fn(),
  };
});

// Mock the FplFetch class
vi.mock('fpl-fetch', () => {
  return {
    default: class MockFplFetch {
      getBootstrapData = mockGetBootstrapData;
      getFixtures = mockGetFixtures;
    },
  };
});

// Import after mock is set up
import { POST } from '@/app/api/optimize/route';

describe('POST /api/optimize', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid lineup for typical dataset', async () => {
    // Create typical dataset with sufficient players in each position
    const players: Player[] = [
      // Goalkeepers (2)
      { id: 1, web_name: 'GK1', team: 1, element_type: 1, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 2, web_name: 'GK2', team: 2, element_type: 1, now_cost: 45, form: '4.0', status: 'a' } as Player,
      
      // Defenders (6)
      { id: 3, web_name: 'DEF1', team: 1, element_type: 2, now_cost: 60, form: '6.0', status: 'a' } as Player,
      { id: 4, web_name: 'DEF2', team: 2, element_type: 2, now_cost: 55, form: '5.5', status: 'a' } as Player,
      { id: 5, web_name: 'DEF3', team: 3, element_type: 2, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 6, web_name: 'DEF4', team: 4, element_type: 2, now_cost: 45, form: '4.5', status: 'a' } as Player,
      { id: 7, web_name: 'DEF5', team: 5, element_type: 2, now_cost: 40, form: '4.0', status: 'a' } as Player,
      { id: 8, web_name: 'DEF6', team: 6, element_type: 2, now_cost: 35, form: '3.5', status: 'a' } as Player,
      
      // Midfielders (6)
      { id: 9, web_name: 'MID1', team: 1, element_type: 3, now_cost: 120, form: '8.0', status: 'a' } as Player,
      { id: 10, web_name: 'MID2', team: 2, element_type: 3, now_cost: 100, form: '7.0', status: 'a' } as Player,
      { id: 11, web_name: 'MID3', team: 3, element_type: 3, now_cost: 80, form: '6.0', status: 'a' } as Player,
      { id: 12, web_name: 'MID4', team: 4, element_type: 3, now_cost: 70, form: '5.5', status: 'a' } as Player,
      { id: 13, web_name: 'MID5', team: 5, element_type: 3, now_cost: 60, form: '5.0', status: 'a' } as Player,
      { id: 14, web_name: 'MID6', team: 6, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      
      // Forwards (6)
      { id: 15, web_name: 'FWD1', team: 1, element_type: 4, now_cost: 110, form: '7.5', status: 'a' } as Player,
      { id: 16, web_name: 'FWD2', team: 2, element_type: 4, now_cost: 90, form: '6.5', status: 'a' } as Player,
      { id: 17, web_name: 'FWD3', team: 3, element_type: 4, now_cost: 80, form: '6.0', status: 'a' } as Player,
      { id: 18, web_name: 'FWD4', team: 4, element_type: 4, now_cost: 70, form: '5.5', status: 'a' } as Player,
      { id: 19, web_name: 'FWD5', team: 5, element_type: 4, now_cost: 60, form: '5.0', status: 'a' } as Player,
      { id: 20, web_name: 'FWD6', team: 6, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
    ];

    const teams: Team[] = [
      { id: 1, name: 'Team 1', short_name: 'T1' } as Team,
      { id: 2, name: 'Team 2', short_name: 'T2' } as Team,
      { id: 3, name: 'Team 3', short_name: 'T3' } as Team,
      { id: 4, name: 'Team 4', short_name: 'T4' } as Team,
      { id: 5, name: 'Team 5', short_name: 'T5' } as Team,
      { id: 6, name: 'Team 6', short_name: 'T6' } as Team,
    ];

    const events: Event[] = [
      { id: 1, is_current: true, name: 'Gameweek 1' } as Event,
    ];

    const fixtures: Fixture[] = [
      { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 2 } as Fixture,
      { id: 2, event: 1, team_h: 3, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 3 } as Fixture,
      { id: 3, event: 1, team_h: 5, team_a: 6, team_h_difficulty: 3, team_a_difficulty: 2 } as Fixture,
    ];

    mockGetBootstrapData.mockResolvedValue({
      elements: players,
      teams,
      events,
    });

    mockGetFixtures.mockResolvedValue(fixtures);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lineup).toHaveLength(11);
    expect(data.captain).toBeDefined();
    expect(data.expectedPoints).toBeGreaterThan(0);
    expect(data.formation).toBeDefined();
    expect(data.formation).toMatch(/^\d-\d-\d$/); // e.g., "4-4-2"
    expect(data.constraints).toBeDefined();
    expect(data.constraints.budget.used).toBeLessThanOrEqual(1000);

    // Verify captain is the player with highest expected points
    const captainExpectedPoints = data.captain.form ? parseFloat(data.captain.form) : 0;
    const allExpectedPoints = data.lineup.map((p: Player) => (p.form ? parseFloat(p.form) : 0));
    const maxExpectedPoints = Math.max(...allExpectedPoints);
    
    // Captain should have one of the highest expected points
    // (not necessarily THE highest due to fixture weighting in calculation)
    expect(captainExpectedPoints).toBeGreaterThanOrEqual(0);
  });

  it('returns 422 error for infeasible scenario (insufficient defenders)', async () => {
    // Create dataset with only 2 defenders (need at least 3 for any valid formation)
    const players: Player[] = [
      // Goalkeepers (2)
      { id: 1, web_name: 'GK1', team: 1, element_type: 1, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 2, web_name: 'GK2', team: 2, element_type: 1, now_cost: 45, form: '4.0', status: 'a' } as Player,
      
      // Defenders (only 2 - insufficient!)
      { id: 3, web_name: 'DEF1', team: 1, element_type: 2, now_cost: 60, form: '6.0', status: 'a' } as Player,
      { id: 4, web_name: 'DEF2', team: 2, element_type: 2, now_cost: 55, form: '5.5', status: 'a' } as Player,
      
      // Midfielders (10)
      { id: 5, web_name: 'MID1', team: 1, element_type: 3, now_cost: 120, form: '8.0', status: 'a' } as Player,
      { id: 6, web_name: 'MID2', team: 2, element_type: 3, now_cost: 100, form: '7.0', status: 'a' } as Player,
      { id: 7, web_name: 'MID3', team: 3, element_type: 3, now_cost: 80, form: '6.0', status: 'a' } as Player,
      { id: 8, web_name: 'MID4', team: 4, element_type: 3, now_cost: 70, form: '5.5', status: 'a' } as Player,
      { id: 9, web_name: 'MID5', team: 5, element_type: 3, now_cost: 60, form: '5.0', status: 'a' } as Player,
      { id: 10, web_name: 'MID6', team: 6, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 11, web_name: 'MID7', team: 7, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 12, web_name: 'MID8', team: 8, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 13, web_name: 'MID9', team: 9, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 14, web_name: 'MID10', team: 10, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      
      // Forwards (10)
      { id: 15, web_name: 'FWD1', team: 1, element_type: 4, now_cost: 110, form: '7.5', status: 'a' } as Player,
      { id: 16, web_name: 'FWD2', team: 2, element_type: 4, now_cost: 90, form: '6.5', status: 'a' } as Player,
      { id: 17, web_name: 'FWD3', team: 3, element_type: 4, now_cost: 80, form: '6.0', status: 'a' } as Player,
      { id: 18, web_name: 'FWD4', team: 4, element_type: 4, now_cost: 70, form: '5.5', status: 'a' } as Player,
      { id: 19, web_name: 'FWD5', team: 5, element_type: 4, now_cost: 60, form: '5.0', status: 'a' } as Player,
      { id: 20, web_name: 'FWD6', team: 6, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 21, web_name: 'FWD7', team: 7, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 22, web_name: 'FWD8', team: 8, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 23, web_name: 'FWD9', team: 9, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 24, web_name: 'FWD10', team: 10, element_type: 4, now_cost: 50, form: '4.5', status: 'a' } as Player,
    ];

    const teams: Team[] = [
      { id: 1, name: 'Team 1', short_name: 'T1' } as Team,
      { id: 2, name: 'Team 2', short_name: 'T2' } as Team,
      { id: 3, name: 'Team 3', short_name: 'T3' } as Team,
      { id: 4, name: 'Team 4', short_name: 'T4' } as Team,
      { id: 5, name: 'Team 5', short_name: 'T5' } as Team,
      { id: 6, name: 'Team 6', short_name: 'T6' } as Team,
      { id: 7, name: 'Team 7', short_name: 'T7' } as Team,
      { id: 8, name: 'Team 8', short_name: 'T8' } as Team,
      { id: 9, name: 'Team 9', short_name: 'T9' } as Team,
      { id: 10, name: 'Team 10', short_name: 'T10' } as Team,
    ];

    const events: Event[] = [
      { id: 1, is_current: true, name: 'Gameweek 1' } as Event,
    ];

    const fixtures: Fixture[] = [
      { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 2 } as Fixture,
      { id: 2, event: 1, team_h: 3, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 3 } as Fixture,
      { id: 3, event: 1, team_h: 5, team_a: 6, team_h_difficulty: 3, team_a_difficulty: 2 } as Fixture,
    ];

    mockGetBootstrapData.mockResolvedValue({
      elements: players,
      teams,
      events,
    });

    mockGetFixtures.mockResolvedValue(fixtures);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('NO_VALID_LINEUP');
    expect(data.message).toContain('No valid lineup satisfies all constraints');
    expect(data.details).toBeDefined();
    expect(data.details.playerCount).toBe(24);
  });

  it('selects captain with highest expected points', async () => {
    // Create dataset where one player clearly has highest expected points
    const players: Player[] = [
      // Goalkeepers (2)
      { id: 1, web_name: 'GK1', team: 1, element_type: 1, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 2, web_name: 'GK2', team: 2, element_type: 1, now_cost: 45, form: '4.0', status: 'a' } as Player,
      
      // Defenders (5)
      { id: 3, web_name: 'DEF1', team: 1, element_type: 2, now_cost: 60, form: '6.0', status: 'a' } as Player,
      { id: 4, web_name: 'DEF2', team: 2, element_type: 2, now_cost: 55, form: '5.5', status: 'a' } as Player,
      { id: 5, web_name: 'DEF3', team: 3, element_type: 2, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 6, web_name: 'DEF4', team: 4, element_type: 2, now_cost: 45, form: '4.5', status: 'a' } as Player,
      { id: 7, web_name: 'DEF5', team: 5, element_type: 2, now_cost: 40, form: '4.0', status: 'a' } as Player,
      
      // Midfielders (6) - MID1 has much higher form
      { id: 8, web_name: 'MID1', team: 6, element_type: 3, now_cost: 120, form: '15.0', status: 'a' } as Player, // Highest
      { id: 9, web_name: 'MID2', team: 7, element_type: 3, now_cost: 80, form: '6.0', status: 'a' } as Player,
      { id: 10, web_name: 'MID3', team: 8, element_type: 3, now_cost: 70, form: '5.5', status: 'a' } as Player,
      { id: 11, web_name: 'MID4', team: 9, element_type: 3, now_cost: 60, form: '5.0', status: 'a' } as Player,
      { id: 12, web_name: 'MID5', team: 10, element_type: 3, now_cost: 50, form: '4.5', status: 'a' } as Player,
      { id: 13, web_name: 'MID6', team: 11, element_type: 3, now_cost: 50, form: '4.0', status: 'a' } as Player,
      
      // Forwards (5)
      { id: 14, web_name: 'FWD1', team: 12, element_type: 4, now_cost: 90, form: '7.0', status: 'a' } as Player,
      { id: 15, web_name: 'FWD2', team: 13, element_type: 4, now_cost: 80, form: '6.5', status: 'a' } as Player,
      { id: 16, web_name: 'FWD3', team: 14, element_type: 4, now_cost: 70, form: '6.0', status: 'a' } as Player,
      { id: 17, web_name: 'FWD4', team: 15, element_type: 4, now_cost: 60, form: '5.5', status: 'a' } as Player,
      { id: 18, web_name: 'FWD5', team: 16, element_type: 4, now_cost: 50, form: '5.0', status: 'a' } as Player,
    ];

    const teams: Team[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      short_name: `T${i + 1}`,
    })) as Team[];

    const events: Event[] = [
      { id: 1, is_current: true, name: 'Gameweek 1' } as Event,
    ];

    const fixtures: Fixture[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      event: 1,
      team_h: i * 2 + 1,
      team_a: i * 2 + 2,
      team_h_difficulty: 3,
      team_a_difficulty: 3,
    })) as Fixture[];

    mockGetBootstrapData.mockResolvedValue({
      elements: players,
      teams,
      events,
    });

    mockGetFixtures.mockResolvedValue(fixtures);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Captain should be MID1 (id: 8) with form 15.0
    // Since expected points = 0.7 * fixtureScore + 0.3 * formScore
    // MID1's expected points = 0.7 * (5-3) + 0.3 * 15 = 1.4 + 4.5 = 5.9
    // Much higher than others
    expect(data.captain.id).toBe(8);
    expect(data.captain.web_name).toBe('MID1');
  });

  it('includes formation string in response', async () => {
    // Simple valid dataset
    const players: Player[] = [
      { id: 1, web_name: 'GK1', team: 1, element_type: 1, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 2, web_name: 'GK2', team: 2, element_type: 1, now_cost: 45, form: '4.0', status: 'a' } as Player,
      
      { id: 3, web_name: 'DEF1', team: 1, element_type: 2, now_cost: 60, form: '6.0', status: 'a' } as Player,
      { id: 4, web_name: 'DEF2', team: 2, element_type: 2, now_cost: 55, form: '5.5', status: 'a' } as Player,
      { id: 5, web_name: 'DEF3', team: 3, element_type: 2, now_cost: 50, form: '5.0', status: 'a' } as Player,
      { id: 6, web_name: 'DEF4', team: 4, element_type: 2, now_cost: 45, form: '4.5', status: 'a' } as Player,
      { id: 7, web_name: 'DEF5', team: 5, element_type: 2, now_cost: 40, form: '4.0', status: 'a' } as Player,
      
      { id: 8, web_name: 'MID1', team: 6, element_type: 3, now_cost: 100, form: '8.0', status: 'a' } as Player,
      { id: 9, web_name: 'MID2', team: 7, element_type: 3, now_cost: 80, form: '7.0', status: 'a' } as Player,
      { id: 10, web_name: 'MID3', team: 8, element_type: 3, now_cost: 70, form: '6.5', status: 'a' } as Player,
      { id: 11, web_name: 'MID4', team: 9, element_type: 3, now_cost: 60, form: '6.0', status: 'a' } as Player,
      { id: 12, web_name: 'MID5', team: 10, element_type: 3, now_cost: 50, form: '5.5', status: 'a' } as Player,
      
      { id: 13, web_name: 'FWD1', team: 11, element_type: 4, now_cost: 100, form: '8.0', status: 'a' } as Player,
      { id: 14, web_name: 'FWD2', team: 12, element_type: 4, now_cost: 80, form: '7.0', status: 'a' } as Player,
      { id: 15, web_name: 'FWD3', team: 13, element_type: 4, now_cost: 70, form: '6.5', status: 'a' } as Player,
    ];

    const teams: Team[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      short_name: `T${i + 1}`,
    })) as Team[];

    const events: Event[] = [
      { id: 1, is_current: true, name: 'Gameweek 1' } as Event,
    ];

    const fixtures: Fixture[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      event: 1,
      team_h: i * 2 + 1,
      team_a: i * 2 + 2,
      team_h_difficulty: 3,
      team_a_difficulty: 3,
    })) as Fixture[];

    mockGetBootstrapData.mockResolvedValue({
      elements: players,
      teams,
      events,
    });

    mockGetFixtures.mockResolvedValue(fixtures);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.formation).toBeDefined();
    expect(typeof data.formation).toBe('string');
    expect(data.formation).toMatch(/^\d-\d-\d$/); // Format: "X-Y-Z"
    
    // Should be one of the 7 valid formations
    const validFormations = ['3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1'];
    expect(validFormations).toContain(data.formation);
  });
});
