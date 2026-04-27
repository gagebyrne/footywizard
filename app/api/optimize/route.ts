import { runOptimization } from '@/lib/optimizer/run-optimization';

/**
 * POST /api/optimize
 *
 * Thin wrapper around runOptimization() so client-side callers can hit it
 * over HTTP. Server components should call runOptimization() directly.
 */
export async function POST() {
  const result = await runOptimization();
  if (!result.ok) {
    return Response.json(result.error, { status: result.status });
  }
  return Response.json(result.data);
}
