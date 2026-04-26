import FplFetch from 'fpl-fetch';
import type { Player, Team, Event } from '@/lib/types/fpl';

/**
 * Bootstrap static data endpoint
 * 
 * Returns all players, teams, events (gameweeks), and game settings.
 * Cached for 30 minutes (1800 seconds) — player stats update frequency.
 * 
 * Response shape:
 * - elements: Player[]
 * - teams: Team[]
 * - events: Event[]
 * - game_settings: object
 */
export const revalidate = 1800; // 30 minutes

const fpl = new FplFetch();

export async function GET() {
  try {
    const data = await fpl.getBootstrapData();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bootstrap-static data';
    console.error('[API] bootstrap-static error:', message, error);
    return Response.json({ error: message }, { status: 500 });
  }
}
