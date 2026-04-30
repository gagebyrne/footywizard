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
        <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] py-8 px-6 sm:px-10 lg:px-14">
          <div className="max-w-[1200px] mx-auto space-y-7">
            <div
              className="px-4 py-3 flex items-start gap-3"
              style={{
                border: `1px solid var(--ink)`,
                background: 'var(--paper-hi)',
              }}
              role="alert"
              aria-live="polite"
            >
              <div className="flex-1">
                <p className="font-serif font-extrabold text-lg">
                  Showing cached lineup from {age}
                </p>
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.16em] mt-1"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  Unable to fetch latest optimisation. Press retry to try again.
                </p>
                {isStale && (
                  <p
                    className="font-mono text-[11px] uppercase tracking-[0.16em] mt-1"
                    style={{ color: 'var(--red-rule)' }}
                  >
                    Cache is more than 24 hours old
                  </p>
                )}
              </div>
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="font-mono text-[10px] uppercase tracking-[0.16em] border border-[var(--ink)] text-[var(--ink)] bg-transparent hover:bg-[var(--paper)]"
              >
                Retry
              </Button>
            </div>

            <div className="text-center space-y-1">
              <p className="font-serif font-extrabold text-5xl tracking-[-0.03em] text-[var(--ink)]">
                {cached.expectedPoints.toFixed(1)}
                <span className="text-2xl ml-2 font-medium text-[var(--ink-soft)]">pts</span>
              </p>
              <p
                className="font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{ color: 'var(--ink-mute)' }}
              >
                Expected points · {cached.formation} · cached {age}
              </p>
            </div>

            <FormationPitch
              lineup={cached.lineup}
              captain={cached.captain}
              formation={cached.formation}
              fixtures={this.props.fixtures}
              teams={this.props.teams}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] text-[var(--ink)] px-4">
        <div
          className="text-center space-y-5 p-8 max-w-md"
          style={{ border: '2px solid var(--ink)', background: 'var(--paper-hi)' }}
        >
          <h1
            className="font-serif font-extrabold text-2xl"
            style={{ color: 'var(--red-rule)' }}
          >
            Unable to generate lineup
          </h1>
          <p style={{ color: 'var(--ink-soft)' }} className="font-serif italic">
            The optimisation service is currently unavailable. Please try refreshing in a few
            minutes.
          </p>
          <Button
            onClick={this.handleRetry}
            className="font-mono text-[10px] uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90"
          >
            Retry
          </Button>
          {this.state.error && (
            <details className="text-left mt-3">
              <summary
                className="font-mono text-[10px] uppercase tracking-[0.14em] cursor-pointer"
                style={{ color: 'var(--ink-mute)' }}
              >
                Technical details
              </summary>
              <pre
                className="mt-2 text-xs overflow-auto p-2"
                style={{ background: 'var(--paper)', color: 'var(--red-rule)' }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
