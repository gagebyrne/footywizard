import FplFetch from 'fpl-fetch';
import type { ElementSummary } from '@/lib/types/fpl';

/**
 * Element (player) summary endpoint
 * 
 * Returns a player's historical performance and upcoming fixtures.
 * Cached for 30 minutes (1800 seconds) — matches player stats refresh rate.
 * 
 * Path params:
 * - id: Player ID (numeric, e.g., 302 for Salah)
 * 
 * Response: ElementSummary with history[] and fixtures[]
 */
export const revalidate = 1800; // 30 minutes

const fpl = new FplFetch();

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // Validate ID is numeric
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return Response.json(
        { error: 'Invalid player ID: must be numeric' },
        { status: 400 }
      );
    }
    
    const summary = await fpl.getPlayer(numericId);
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch element summary';
    console.error('[API] element-summary error:', message, error);
    return Response.json({ error: message }, { status: 500 });
  }
}
