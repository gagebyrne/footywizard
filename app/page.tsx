import { Suspense } from 'react';
import type { OptimizeResponse } from '@/lib/types/optimizer';
import type { Fixture, Team, Player } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { TransferTargets } from '@/components/transfer-targets';
import { FixtureOutlook } from '@/components/fixture-outlook';
import { LineupSkeleton } from '@/components/lineup-skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import { CacheHandler } from '@/components/cache-handler';

async function fetchOptimization(): Promise<OptimizeResponse | null> {
  try {
    const res = await fetch('http://localhost:3000/api/optimize', {
      method: 'POST',
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[page.tsx] Optimization API failed:', res.status);
      return null;
    }

    const data = await res.json();

    // Cache successful optimization for offline fallback
    if (data) {
      console.log('[page.tsx] Optimization successful, caching result');
      // Note: saveCachedLineup is client-side only, will be called from client wrapper
    }

    return data;
  } catch (error) {
    console.error('[page.tsx] Failed to fetch optimization:', error);
    return null;
  }
}

async function fetchFixtures(): Promise<Fixture[]> {
  try {
    const res = await fetch('http://localhost:3000/api/fpl/fixtures', {
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('[page.tsx] Fixtures API failed:', res.status);
      return [];
    }

    const fixtures = await res.json();
    console.log(`[page.tsx] Loaded ${fixtures.length} fixtures for tooltip context`);
    return fixtures;
  } catch (error) {
    console.error('[page.tsx] Failed to fetch fixtures:', error);
    return [];
  }
}

async function fetchBootstrapData(): Promise<{ teams: Team[]; players: Player[] }> {
  try {
    const res = await fetch('http://localhost:3000/api/fpl/bootstrap-static', {
      cache: 'force-cache',
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.error('[page.tsx] Bootstrap-static API failed:', res.status);
      return { teams: [], players: [] };
    }

    const data = await res.json();
    return {
      teams: data.teams || [],
      players: data.elements || [],
    };
  } catch (error) {
    console.error('[page.tsx] Failed to fetch bootstrap data:', error);
    return { teams: [], players: [] };
  }
}

/**
 * Secondary data component wrapped in Suspense for non-blocking loading.
 * Displays transfer targets and fixture outlook using bootstrap data.
 */
async function SecondaryData({
  lineup,
  fixtures,
}: {
  lineup: OptimizeResponse['lineup'];
  fixtures: Fixture[];
}) {
  const { teams, players } = await fetchBootstrapData();

  return (
    <>
      <TransferTargets
        allPlayers={players}
        lineup={lineup}
        fixtures={fixtures}
        teams={teams}
      />

      <FixtureOutlook lineup={lineup} fixtures={fixtures} teams={teams} />
    </>
  );
}

export default async function Home() {
  // Fetch critical data in parallel (async-parallel pattern from react-best-practices)
  const [data, fixtures, bootstrapData] = await Promise.all([
    fetchOptimization(),
    fetchFixtures(),
    fetchBootstrapData(),
  ]);

  const { teams, players } = bootstrapData;

  // If optimization fails, try to use cached data
  if (!data) {
    console.log('[page.tsx] Optimization failed, checking cache');

    // Server-side cannot access localStorage, will fallback in ErrorBoundary
    return (
      <ErrorBoundary fixtures={fixtures} teams={teams}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900">
          <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <h1 className="text-2xl font-bold text-red-400">Failed to load lineup</h1>
            <p className="text-slate-300">
              Check that the API server is running or wait for cached data to load.
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fixtures={fixtures} teams={teams}>
      {/* Cache successful optimization result to localStorage */}
      <CacheHandler data={data} />

      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Stats */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-2xl">
              {data.expectedPoints.toFixed(1)}
              <span className="text-xl sm:text-2xl ml-2 font-medium text-emerald-300">
                pts
              </span>
            </h1>
            <p className="text-base sm:text-lg font-medium text-slate-300">
              Expected Points • {data.formation}
            </p>
            <p className="text-sm text-slate-400">
              £{(data.constraints.budget.used / 10).toFixed(1)}m / £
              {data.constraints.budget.limit / 10}m
            </p>
          </div>

          {/* Responsive Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Formation Pitch - spans full width on mobile, 2 columns on desktop */}
            <div className="md:col-span-2 lg:col-span-2">
              <FormationPitch
                lineup={data.lineup}
                captain={data.captain}
                formation={data.formation}
                fixtures={fixtures}
                teams={teams}
              />
            </div>

            {/* Sidebar - Transfer Targets and Fixture Outlook stacked */}
            <div className="space-y-6 md:col-span-2 lg:col-span-1">
              {/* Wrap secondary data in Suspense for non-blocking load */}
              <Suspense
                fallback={
                  <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <p className="text-slate-300 text-sm animate-pulse">
                        Loading transfer targets...
                      </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <p className="text-slate-300 text-sm animate-pulse">
                        Loading fixture outlook...
                      </p>
                    </div>
                  </div>
                }
              >
                <SecondaryData lineup={data.lineup} fixtures={fixtures} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
