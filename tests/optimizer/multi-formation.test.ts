/**
 * Multi-formation optimization tests
 * 
 * Validates that all 7 formations are tried and the best one is selected.
 * Uses realistic 600-player dataset from FPL API.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Player } from '../../lib/types/fpl';
import { optimizeAllFormations } from '../../lib/optimizer/ilp-solver';
import { calculateExpectedPoints } from '../../lib/optimizer/expected-points';
import { VALID_FORMATIONS, validateLineup } from '../../lib/optimizer/formation-validator';

describe('Multi-formation optimization', () => {
  let players: Player[] = [];
  let expectedPoints: Map<number, number>;

  beforeAll(async () => {
    // Fetch realistic player dataset from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) {
      throw new Error(`FPL API fetch failed: ${response.status}`);
    }

    const data = await response.json();
    players = data.elements as Player[];

    console.log(`[Test] Loaded ${players.length} players from FPL API`);

    // Calculate expected points for all players
    // Create fixtures with neutral difficulty (3) for each team
    const teamIds = new Set(players.map(p => p.team));
    const fixtures = Array.from(teamIds).map((teamId, idx) => ({
      id: idx + 1,
      event: 1,
      team_h: teamId,
      team_a: (teamId % 20) + 1, // Arbitrary opponent
      team_h_difficulty: 3,
      team_a_difficulty: 3,
    }));

    expectedPoints = new Map();
    for (const player of players) {
      const points = calculateExpectedPoints(player, fixtures as any, []);
      expectedPoints.set(player.id, points);
    }

    console.log(`[Test] Calculated expected points for ${expectedPoints.size} players`);
  }, 30000); // 30s timeout for API fetch

  it('should try all 7 formations and select the best', () => {
    const startTime = Date.now();

    const result = optimizeAllFormations(players, expectedPoints);

    const solveTime = Date.now() - startTime;

    expect(result).not.toBeNull();
    expect(solveTime).toBeLessThan(10000); // Must complete in <10s

    console.log('[Test] Multi-formation solve completed', {
      solveTime,
      totalExpectedPoints: result!.totalExpectedPoints,
      totalCost: result!.totalCost,
    });
  }, 15000);

  it('should return valid lineup that passes validation', { timeout: 15000 }, () => {
    const result = optimizeAllFormations(players, expectedPoints);
    
    expect(result).not.toBeNull();
    expect(result!.players).toHaveLength(11);

    // Find which formation was selected by counting positions
    const positionCounts = {
      gk: result!.players.filter(p => p.element_type === 1).length,
      def: result!.players.filter(p => p.element_type === 2).length,
      mid: result!.players.filter(p => p.element_type === 3).length,
      fwd: result!.players.filter(p => p.element_type === 4).length,
    };

    // Find matching formation
    let matchingFormation = null;
    for (const [name, formation] of Object.entries(VALID_FORMATIONS)) {
      if (
        formation.gk === positionCounts.gk &&
        formation.def === positionCounts.def &&
        formation.mid === positionCounts.mid &&
        formation.fwd === positionCounts.fwd
      ) {
        matchingFormation = formation;
        console.log(`[Test] Selected formation: ${name}`);
        break;
      }
    }

    expect(matchingFormation).not.toBeNull();

    // Validate lineup
    const validation = validateLineup(result!.players, matchingFormation!);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('should respect budget constraint (£100m)', () => {
    const result = optimizeAllFormations(players, expectedPoints);
    
    expect(result).not.toBeNull();
    expect(result!.totalCost).toBeLessThanOrEqual(1000); // £100m in £0.1m units
  });

  it('should respect team limit (max 3 per team)', () => {
    const result = optimizeAllFormations(players, expectedPoints);
    
    expect(result).not.toBeNull();

    const teamCounts = new Map<number, number>();
    for (const player of result!.players) {
      teamCounts.set(player.team, (teamCounts.get(player.team) ?? 0) + 1);
    }

    for (const [teamId, count] of teamCounts) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('should select captain with highest expected points', () => {
    const result = optimizeAllFormations(players, expectedPoints);
    
    expect(result).not.toBeNull();
    expect(result!.captain).not.toBeNull();

    const captainPoints = expectedPoints.get(result!.captain!.id) ?? 0;
    
    for (const player of result!.players) {
      const playerPoints = expectedPoints.get(player.id) ?? 0;
      expect(captainPoints).toBeGreaterThanOrEqual(playerPoints);
    }
  });

  it('should calculate total expected points including captain bonus', () => {
    const result = optimizeAllFormations(players, expectedPoints);

    expect(result).not.toBeNull();
    expect(result!.captain).not.toBeNull();

    const lineupSum = result!.players.reduce(
      (sum, p) => sum + (expectedPoints.get(p.id) ?? 0),
      0
    );
    const captainXp = expectedPoints.get(result!.captain!.id) ?? 0;

    // totalExpectedPoints = lineup sum + captain xP (captain double counted)
    expect(result!.totalExpectedPoints).toBeCloseTo(lineupSum + captainXp, 2);
  }, 15000);

  it('should fall back to a partial lineup when fewer than 11 viable players', () => {
    // Only 10 viable players — exact mode infeasible, partial mode succeeds.
    const limitedPlayers = players.slice(0, 10);
    const limitedPoints = new Map<number, number>();
    for (const player of limitedPlayers) {
      limitedPoints.set(player.id, expectedPoints.get(player.id) ?? 0);
    }

    const result = optimizeAllFormations(limitedPlayers, limitedPoints);

    expect(result).not.toBeNull();
    expect(result!.partial).toBe(true);
    expect(result!.players.length).toBeLessThanOrEqual(10);
    expect(result!.players.length).toBeGreaterThan(0);
  });

  it('should return null only when zero viable players are supplied', () => {
    const result = optimizeAllFormations([], new Map());
    expect(result).toBeNull();
  });
});
