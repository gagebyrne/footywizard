"use client";

import { Component, type ReactNode } from 'react';
import { getCachedLineup, isCacheStale, formatCacheAge } from '@/lib/cache';
import type { Fixture, Team } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fixtures: Fixture[];
  teams: Team[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary with localStorage fallback.
 * On error, attempts to display cached lineup with staleness warning.
 * If no cache available, shows error message with Retry button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
  }

  handleRetry = () => {
    // Reset error state and reload page to re-fetch data
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Attempt to retrieve cached lineup
    const cached = getCachedLineup();

    if (cached) {
      const isStale = isCacheStale(cached);
      const age = formatCacheAge(cached.timestamp);

      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Staleness warning banner */}
            <div
              className={`${
                isStale ? 'bg-amber-500/20 border-amber-500/40' : 'bg-yellow-500/20 border-yellow-500/40'
              } backdrop-blur-sm border rounded-xl p-4 space-y-3`}
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-amber-300 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1 space-y-2">
                  <p className="text-white font-medium">
                    Showing cached lineup from {age}
                  </p>
                  <p className="text-slate-200 text-sm">
                    Unable to fetch latest optimization. Click Retry to attempt again.
                  </p>
                  {isStale && (
                    <p className="text-amber-200 text-xs font-medium">
                      ⚠ Cache is more than 24 hours old
                    </p>
                  )}
                </div>
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex-shrink-0"
                >
                  Retry
                </Button>
              </div>
            </div>

            {/* Cached lineup display */}
            <div className="text-center space-y-2">
              <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-2xl">
                {cached.expectedPoints.toFixed(1)}
                <span className="text-2xl ml-2 font-medium text-emerald-300">pts</span>
              </h1>
              <p className="text-lg font-medium text-slate-300">
                Expected Points • {cached.formation}
              </p>
              <p className="text-xs text-slate-400 italic">
                Cached {age}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FormationPitch
                  lineup={cached.lineup}
                  captain={cached.captain}
                  formation={cached.formation}
                  fixtures={this.props.fixtures}
                  teams={this.props.teams}
                />
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <p className="text-slate-300 text-sm">
                    Transfer targets and fixture outlook unavailable while offline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // No cached data available - show error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 px-4">
        <div className="text-center space-y-6 p-8 max-w-md rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <svg
            className="w-16 h-16 text-red-400 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Unable to generate lineup</h1>
            <p className="text-slate-300">
              The optimization service is currently unavailable. Please try refreshing in a few minutes.
            </p>
          </div>

          <Button
            onClick={this.handleRetry}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Retry
          </Button>

          {this.state.error && (
            <details className="text-left mt-4">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                Technical details
              </summary>
              <pre className="mt-2 text-xs text-red-300 overflow-auto p-2 bg-black/20 rounded">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
