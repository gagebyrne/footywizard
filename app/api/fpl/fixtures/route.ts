import FplFetch from 'fpl-fetch';
import type { Fixture } from '@/lib/types/fpl';

/**
 * Fixtures endpoint
 *
 * Returns all fixtures, or fixtures for a specific gameweek if ?event= is provided.
 *
 * Query params:
 * - event: Optional gameweek number (e.g., ?event=15)
 *
 * Response: Fixture[]
 */

const fpl = new FplFetch();

function positionToDifficulty(position: number): number {
  if (position <= 4) return 5;
  if (position <= 8) return 4;
  if (position <= 12) return 3;
  if (position <= 16) return 2;
  return 1;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventParam = searchParams.get('event');

    const [fixturesRaw, bootstrap] = await Promise.all([
      fpl.getFixtures(),
      fpl.getBootstrapData(),
    ]);

    const difficultyByTeam = new Map<number, number>(
      bootstrap.teams.map((t) => [t.id, positionToDifficulty(t.position)])
    );

    let fixtures: Fixture[] = fixturesRaw.map((f) => ({
      ...f,
      team_h_difficulty: difficultyByTeam.get(f.team_a) ?? f.team_h_difficulty,
      team_a_difficulty: difficultyByTeam.get(f.team_h) ?? f.team_a_difficulty,
    }));

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
