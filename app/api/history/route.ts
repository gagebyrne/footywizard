/**
 * Historical predictions API
 * 
 * GET /api/history
 * Returns all historical predictions with actuals backfilled and aggregate metrics.
 * 
 * Response:
 * {
 *   predictions: PredictionRecord[],
 *   metrics: {
 *     mae: number | null,
 *     captainHitRate: number | null,
 *     correlation: number | null,
 *     totalGameweeks: number,
 *     gameweeksWithActuals: number
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { getPredictions } from '@/lib/history/predictions';
import { calculateAggregateMetrics } from '@/lib/history/metrics';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Get predictions with actuals backfilled
    const predictions = await getPredictions();
    
    // Calculate aggregate metrics
    const metrics = calculateAggregateMetrics(predictions);
    
    const durationMs = Date.now() - startTime;
    console.log('[History API] Request completed', {
      predictionsCount: predictions.length,
      gameweeksWithActuals: metrics.gameweeksWithActuals,
      durationMs,
    });
    
    return NextResponse.json({
      predictions,
      metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[History API] Request failed', {
      error: message,
    });
    
    return NextResponse.json(
      {
        error: 'Failed to fetch historical predictions',
        details: message,
      },
      { status: 500 }
    );
  }
}
