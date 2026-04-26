import { describe, it, expect } from 'vitest';
import type { Player, Team, Event, Fixture, ElementSummary } from '@/lib/types/fpl';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('FPL API Routes', () => {
  describe('GET /api/fpl/bootstrap-static', () => {
    it('returns object with players, teams, and events arrays', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/bootstrap-static`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('elements');
      expect(data).toHaveProperty('teams');
      expect(data).toHaveProperty('events');
      expect(Array.isArray(data.elements)).toBe(true);
      expect(Array.isArray(data.teams)).toBe(true);
      expect(Array.isArray(data.events)).toBe(true);
      expect(data.elements.length).toBeGreaterThan(0);
    });

    it('players have required fields matching Player type', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/bootstrap-static`);
      const data = await response.json();
      
      const player = data.elements[0] as Player;
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('web_name');
      expect(player).toHaveProperty('form');
      expect(player).toHaveProperty('now_cost');
      expect(typeof player.id).toBe('number');
      expect(typeof player.web_name).toBe('string');
      expect(typeof player.now_cost).toBe('number');
    });
  });

  describe('GET /api/fpl/fixtures', () => {
    it('returns array of fixtures', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/fixtures`);
      expect(response.ok).toBe(true);
      
      const fixtures = await response.json();
      expect(Array.isArray(fixtures)).toBe(true);
      expect(fixtures.length).toBeGreaterThan(0);
    });

    it('fixtures have team_h, team_a, and difficulty ratings', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/fixtures`);
      const fixtures = await response.json();
      
      const fixture = fixtures[0] as Fixture;
      expect(fixture).toHaveProperty('team_h');
      expect(fixture).toHaveProperty('team_a');
      expect(fixture).toHaveProperty('team_h_difficulty');
      expect(fixture).toHaveProperty('team_a_difficulty');
      expect(typeof fixture.team_h).toBe('number');
      expect(typeof fixture.team_a).toBe('number');
      expect(typeof fixture.team_h_difficulty).toBe('number');
      expect(typeof fixture.team_a_difficulty).toBe('number');
    });

    it('filters fixtures by event query parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/fixtures?event=1`);
      expect(response.ok).toBe(true);
      
      const fixtures = await response.json();
      expect(Array.isArray(fixtures)).toBe(true);
      
      // All returned fixtures should be for gameweek 1
      fixtures.forEach((fixture: Fixture) => {
        expect(fixture.event).toBe(1);
      });
    });
  });

  describe('GET /api/fpl/element-summary/[id]', () => {
    it('returns object with history array for valid player ID', async () => {
      // Test with a known player ID (302 is typically Mohamed Salah)
      const response = await fetch(`${BASE_URL}/api/fpl/element-summary/302`);
      expect(response.ok).toBe(true);
      
      const summary = await response.json();
      expect(summary).toHaveProperty('history');
      expect(Array.isArray(summary.history)).toBe(true);
    });

    it('returns 400 error for non-numeric ID', async () => {
      const response = await fetch(`${BASE_URL}/api/fpl/element-summary/invalid`);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid player ID');
    });
  });
});
