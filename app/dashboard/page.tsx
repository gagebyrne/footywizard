import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import FplFetch from 'fpl-fetch';
import type { OptimizeResponse } from '@/lib/types/optimizer';
import type { Fixture, Team, Player } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { TransferTargets } from '@/components/transfer-targets';
import { FixtureOutlook } from '@/components/fixture-outlook';
import { ErrorBoundary } from '@/components/error-boundary';
import { CacheHandler } from '@/components/cache-handler';
import { AppNav } from '@/components/app-nav';
import { runOptimization } from '@/lib/optimizer/run-optimization';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const fpl = new FplFetch();

async function fetchOptimization(squadPlayerIds: number[]): Promise<OptimizeResponse | null> {
  const result = await runOptimization(squadPlayerIds);
  if (!result.ok) {
    console.error('[dashboard/page.tsx] Optimization failed:', result.error.error);
    return null;
  }
  return result.data;
}

async function fetchFixtures(): Promise<Fixture[]> {
  try {
    return await fpl.getFixtures();
  } catch (error) {
    console.error('[dashboard/page.tsx] Failed to fetch fixtures:', error);
    return [];
  }
}

async function fetchBootstrapData(): Promise<{ teams: Team[]; players: Player[] }> {
  try {
    const data = await fpl.getBootstrapData();
    return { teams: data.teams || [], players: data.elements || [] };
  } catch (error) {
    console.error('[dashboard/page.tsx] Failed to fetch bootstrap data:', error);
    return { teams: [], players: [] };
  }
}

async function SecondaryData({
  lineup,
  fixtures,
  squadIds,
}: {
  lineup: OptimizeResponse['lineup'];
  fixtures: Fixture[];
  squadIds: number[];
}) {
  const { teams, players } = await fetchBootstrapData();
  const squadPlayers = players.filter(p => squadIds.includes(p.id));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TransferTargets allPlayers={players} lineup={lineup} squadIds={squadIds} fixtures={fixtures} teams={teams} />
      <FixtureOutlook players={squadPlayers} fixtures={fixtures} teams={teams} />
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Redirect to team setup if no squad saved yet
  const { data: squadData } = await supabase
    .from('user_squads')
    .select('player_ids')
    .eq('user_id', user.id)
    .maybeSingle();

  const playerIds: number[] = squadData?.player_ids ?? [];
  if (playerIds.length < 15) redirect('/team');

  const [data, fixtures, bootstrapData] = await Promise.all([
    fetchOptimization(playerIds),
    fetchFixtures(),
    fetchBootstrapData(),
  ]);

  const { teams, players: allPlayers } = bootstrapData;

  if (!data) {
    return (
      <ErrorBoundary fixtures={fixtures} teams={teams}>
        <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900">
          <AppNav />
          <div className="flex items-center justify-center py-32 px-4">
            <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <h1 className="text-2xl font-bold text-red-400">Failed to load lineup</h1>
              <p className="text-slate-300">
                Check that the API server is running or wait for cached data to load.
              </p>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const lineupIds = new Set(data.lineup.map(p => p.id));
  const benchPlayers = allPlayers.filter(p => playerIds.includes(p.id) && !lineupIds.has(p.id));

  return (
    <ErrorBoundary fixtures={fixtures} teams={teams}>
      <CacheHandler data={data} />

      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900">
        <AppNav />

        <div className="py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-10">

            <header className="text-center space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-black text-white leading-none">
                    {data.expectedPoints.toFixed(1)}
                    <span className="text-xl sm:text-2xl font-medium text-emerald-300 ml-1.5">pts</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase">Expected Points</p>
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
                    Squad Value
                  </p>
                </div>
              </div>
            </header>

            {data.partial && (
              <div className="max-w-xl mx-auto rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <strong className="font-semibold">Partial lineup.</strong>{' '}
                Some pitch slots are empty because squad players are unavailable
                (injured, doubtful, suspended) or have no fixture in this gameweek.
              </div>
            )}

            <div className="max-w-xl mx-auto">
              <FormationPitch
                lineup={data.lineup}
                captain={data.captain}
                formation={data.formation}
                fixtures={fixtures}
                teams={teams}
                bench={benchPlayers}
              />
            </div>

            <Suspense fallback={<SecondaryFallback />}>
              <SecondaryData lineup={data.lineup} fixtures={fixtures} squadIds={playerIds} />
            </Suspense>

          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
