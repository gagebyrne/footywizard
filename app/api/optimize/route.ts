import { runOptimization } from '@/lib/optimizer/run-optimization';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/optimize
 *
 * Thin wrapper around runOptimization() so client-side callers can hit it
 * over HTTP. Server components should call runOptimization() directly.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await runOptimization(undefined, user?.id);
  if (!result.ok) {
    return Response.json(result.error, { status: result.status });
  }
  return Response.json(result.data);
}
