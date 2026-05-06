import FplFetch from 'fpl-fetch';
import type { Fixture } from '@/lib/types/fpl';

/**
 * Fixtures endpoint
 *
 * Returns all fixtures, or fixtures for a specific gameweek if ?event= is provided.
 * Difficulty values are overridden using the opponent's current league position
 * (see lib/optimizer/fixture-difficulty.ts).
 */

const fpl = new FplFetch();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventParam = searchParams.get('event');

    const fixturesRaw = await fpl.getFixtures();

    let fixtures: Fixture[] = fixturesRaw;

    if (eventParam) {
      const eventId = Number(eventParam);
      fixtures = fixtures.filter((f) => f.event === eventId);
    }

    return Response.json(fixtures);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fixtures';
    console.error('[API] fixtures error:', message, error);
    return Response.json({ error: message }, { status: 500 });
  }
}
