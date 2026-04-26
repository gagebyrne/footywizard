import FplFetch from 'fpl-fetch';
import type { Fixture } from '@/lib/types/fpl';

/**
 * Fixtures endpoint
 * 
 * Returns all fixtures, or fixtures for a specific gameweek if ?event= is provided.
 * Cached for 1 hour (3600 seconds) — fixture data changes infrequently.
 * 
 * Query params:
 * - event: Optional gameweek number (e.g., ?event=15)
 * 
 * Response: Fixture[]
 */
export const revalidate = 3600; // 1 hour

const fpl = new FplFetch();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventParam = searchParams.get('event');
    
    let fixtures = await fpl.getFixtures();
    
    // Filter by event if specified
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
