import { Suspense } from 'react';
import Link from 'next/link';
import type { PredictionRecord } from '@/lib/history/predictions';

/**
 * Aggregate metrics from history API
 */
interface AggregateMetrics {
  mae: number | null;
  captainHitRate: number | null;
  correlation: number | null;
  totalGameweeks: number;
  gameweeksWithActuals: number;
}

/**
 * History API response shape
 */
interface HistoryResponse {
  predictions: PredictionRecord[];
  metrics: AggregateMetrics;
}

/**
 * Fetch historical predictions and metrics from API
 */
async function fetchHistory(): Promise<HistoryResponse | null> {
  try {
    const res = await fetch('http://localhost:3000/api/history', {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[history/page.tsx] History API failed:', res.status);
      return null;
    }

    const data = await res.json();
    console.log('[history/page.tsx] History loaded', {
      predictionsCount: data.predictions?.length || 0,
      gameweeksWithActuals: data.metrics?.gameweeksWithActuals || 0,
    });

    return data;
  } catch (error) {
    console.error('[history/page.tsx] Failed to fetch history:', error);
    return null;
  }
}

/**
 * Format metric value with one decimal precision, or 'N/A' if null
 */
function formatMetric(value: number | null): string {
  return value !== null ? value.toFixed(1) : 'N/A';
}

/**
 * Calculate error for a prediction record
 */
function calculateError(record: PredictionRecord): number | null {
  if (record.totalActualPoints === undefined) {
    return null;
  }
  return Math.abs(record.totalExpectedPoints - record.totalActualPoints);
}

/**
 * History page component
 * 
 * Displays historical predictions with metrics summary and per-gameweek table.
 * Mobile-responsive: stacked metrics, horizontally scrollable table.
 */
export default async function HistoryPage() {
  const data = await fetchHistory();

  // Error state
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <h1 className="text-2xl font-bold text-red-400">Failed to load history</h1>
          <p className="text-slate-300">
            Check that the API server is running and try again.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { predictions, metrics } = data;

  // Empty state
  if (predictions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 max-w-md">
          <h1 className="text-2xl font-bold text-white">No predictions yet</h1>
          <p className="text-slate-300">
            Visit the home page to generate your first lineup and start tracking accuracy.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
          >
            Generate Lineup
          </Link>
        </div>
      </div>
    );
  }

  // Sort predictions by gameweek descending (most recent first)
  const sortedPredictions = [...predictions].sort((a, b) => b.gameweek - a.gameweek);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-2xl">
              Prediction History
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-1">
              Algorithm accuracy across {metrics.totalGameweeks} gameweek{metrics.totalGameweeks !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/10 font-medium"
          >
            ← Back to Lineup
          </Link>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">
              Mean Absolute Error
            </div>
            <div className="text-3xl font-black text-white">
              {formatMetric(metrics.mae)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              pts per gameweek
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">
              Captain Hit Rate
            </div>
            <div className="text-3xl font-black text-white">
              {formatMetric(metrics.captainHitRate)}
              {metrics.captainHitRate !== null && <span className="text-xl ml-1">%</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              captain outperformed team
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">
              Correlation
            </div>
            <div className="text-3xl font-black text-white">
              {formatMetric(metrics.correlation)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              predicted vs actual
            </div>
          </div>
        </div>

        {/* Predictions Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Gameweek Predictions</h2>
            <p className="text-sm text-slate-400 mt-1">
              {metrics.gameweeksWithActuals} of {metrics.totalGameweeks} with actual results
            </p>
          </div>

          {/* Table wrapper with horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    GW
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Formation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Predicted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedPredictions.map((record) => {
                  const error = calculateError(record);
                  const hasActuals = record.totalActualPoints !== undefined;

                  return (
                    <tr key={record.gameweek} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {record.gameweek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {record.formation || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-emerald-300">
                        {record.totalExpectedPoints.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-white">
                        {hasActuals ? record.totalActualPoints!.toFixed(1) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-300">
                        {error !== null ? error.toFixed(1) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-sm text-slate-400">
          <p>
            Actuals are backfilled automatically after each gameweek finishes.
            <br />
            Captain points are counted twice in actual totals (consistent with FPL rules).
          </p>
        </div>
      </div>
    </div>
  );
}
