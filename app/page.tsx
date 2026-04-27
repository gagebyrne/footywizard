import { Suspense } from 'react';
import Image from 'next/image';
import FplFetch from 'fpl-fetch';
import type { OptimizeResponse } from '@/lib/types/optimizer';
import type { Fixture, Team, Player } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { TransferTargets } from '@/components/transfer-targets';
import { FixtureOutlook } from '@/components/fixture-outlook';
import { ErrorBoundary } from '@/components/error-boundary';
import { CacheHandler } from '@/components/cache-handler';
import { runOptimization } from '@/lib/optimizer/run-optimization';

export const dynamic = 'force-dynamic';

const fpl = new FplFetch();

async function fetchOptimization(): Promise<OptimizeResponse | null> {
  const result = await runOptimization();
  if (!result.ok) {
    console.error('[page.tsx] Optimization failed:', result.error.error);
    return null;
  }
  return result.data;
}

async function fetchFixtures(): Promise<Fixture[]> {
  try {
    const fixtures = await fpl.getFixtures();
    console.log(`[page.tsx] Loaded ${fixtures.length} fixtures for tooltip context`);
    return fixtures;
  } catch (error) {
    console.error('[page.tsx] Failed to fetch fixtures:', error);
    return [];
  }
}

async function fetchBootstrapData(): Promise<{ teams: Team[]; players: Player[] }> {
  try {
    const data = await fpl.getBootstrapData();
    return {
      teams: data.teams || [],
      players: data.elements || [],
    };
  } catch (error) {
    console.error('[page.tsx] Failed to fetch bootstrap data:', error);
    return { teams: [], players: [] };
  }
}

async function SecondaryData({
  lineup,
  fixtures,
}: {
  lineup: OptimizeResponse['lineup'];
  fixtures: Fixture[];
}) {
  const { teams, players } = await fetchBootstrapData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TransferTargets
        allPlayers={players}
        lineup={lineup}
        fixtures={fixtures}
        teams={teams}
      />
      <FixtureOutlook lineup={lineup} fixtures={fixtures} teams={teams} />
    </div>
  );
}

function SecondaryFallback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <p className="text-slate-300 text-sm animate-pulse">Loading transfer targets…</p>
      </div>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <p className="text-slate-300 text-sm animate-pulse">Loading fixture outlook…</p>
      </div>
    </div>
  );
}

export default async function Home() {
  const [data, fixtures, bootstrapData] = await Promise.all([
    fetchOptimization(),
    fetchFixtures(),
    fetchBootstrapData(),
  ]);

  const { teams } = bootstrapData;

  if (!data) {
    console.log('[page.tsx] Optimization failed, checking cache');
    return (
      <ErrorBoundary fixtures={fixtures} teams={teams}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900">
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
      <CacheHandler data={data} />

      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Brand Header */}
          <header className="text-center space-y-5">
            <div className="flex items-center justify-center gap-4">
              <Image
                src="/wizard-icon.svg"
                alt="FootyWizard"
                width={64}
                height={64}
                className="drop-shadow-2xl"
                unoptimized
              />
              <div className="text-left">
                <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
                  FootyWizard
                </h1>
                <p className="text-emerald-300 text-lg sm:text-xl font-medium italic mt-1">
                  football made magic
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-black text-white leading-none">
                  {data.expectedPoints.toFixed(1)}
                  <span className="text-xl sm:text-2xl font-medium text-emerald-300 ml-1.5">
                    pts
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase">
                  Expected Points
                </p>
              </div>
              <div className="hidden sm:block w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{data.formation}</div>
                <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase">Formation</p>
              </div>
              <div className="hidden sm:block w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  £{(data.constraints.budget.used / 10).toFixed(1)}m
                </div>
                <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase">
                  of £{data.constraints.budget.limit / 10}m budget
                </p>
              </div>
            </div>
          </header>

          {/* Formation Pitch — centered, controlled width */}
          <div className="max-w-xl mx-auto">
            <FormationPitch
              lineup={data.lineup}
              captain={data.captain}
              formation={data.formation}
              fixtures={fixtures}
              teams={teams}
            />
          </div>

          {/* Transfer Targets + Fixture Outlook — full width, side by side on lg+ */}
          <Suspense fallback={<SecondaryFallback />}>
            <SecondaryData lineup={data.lineup} fixtures={fixtures} />
          </Suspense>

        </div>
      </div>
    </ErrorBoundary>
  );
}
