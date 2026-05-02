import { NextResponse } from 'next/server';
import { getPredictions } from '@/lib/history/predictions';
import { calculateAggregateMetrics } from '@/lib/history/metrics';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const predictions = await getPredictions(user.id);
    const metrics = calculateAggregateMetrics(predictions);

    console.log('[History API] Request completed', {
      predictionsCount: predictions.length,
      gameweeksWithActuals: metrics.gameweeksWithActuals,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ predictions, metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[History API] Request failed', { error: message });
    return NextResponse.json(
      { error: 'Failed to fetch historical predictions', details: message },
      { status: 500 }
    );
  }
}
