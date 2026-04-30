import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import FplFetch from 'fpl-fetch';
import type { OptimizeResponse } from '@/lib/types/optimizer';
import type { Fixture, Team, Player, Event } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { TransferTargets } from '@/components/transfer-targets';
import { FixtureOutlook } from '@/components/fixture-outlook';
import { ErrorBoundary } from '@/components/error-boundary';
import { CacheHandler } from '@/components/cache-handler';
import { AppNav } from '@/components/app-nav';
import { BroadsheetMasthead } from '@/components/broadsheet-masthead';
import { VerdictCard } from '@/components/verdict-card';
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

async function fetchBootstrapData(): Promise<{ teams: Team[]; players: Player[]; events: Event[] }> {
  try {
    const data = await fpl.getBootstrapData();
    return {
      teams: data.teams || [],
      players: data.elements || [],
      events: data.events || [],
    };
  } catch (error) {
    console.error('[dashboard/page.tsx] Failed to fetch bootstrap data:', error);
    return { teams: [], players: [], events: [] };
  }
}

function formatDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return null;
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
  const squadPlayers = players.filter((p) => squadIds.includes(p.id));
  void lineup;
  return <FixtureOutlook players={squadPlayers} fixtures={fixtures} teams={teams} />;
}

function SecondaryFallback() {
  return (
    <div
      className="px-4 py-8 font-serif italic"
      style={{
        background: 'var(--paper-hi)',
        border: '2px solid var(--ink)',
        color: 'var(--ink-mute)',
      }}
    >
      Loading fixture outlook…
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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

  const { teams, players: allPlayers, events } = bootstrapData;
  const nextEvent = events.find((e) => e.is_next) ?? events.find((e) => e.is_current) ?? null;

  if (!data) {
    return (
      <ErrorBoundary fixtures={fixtures} teams={teams}>
        <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
          <AppNav />
          <div className="flex items-center justify-center py-32 px-4">
            <div
              className="text-center space-y-3 p-8"
              style={{ border: '2px solid var(--ink)', background: 'var(--paper-hi)' }}
            >
              <h1
                className="font-serif font-extrabold text-2xl"
                style={{ color: 'var(--red-rule)' }}
              >
                Failed to load lineup
              </h1>
              <p style={{ color: 'var(--ink-soft)' }}>
                Check that the API server is running or wait for cached data to load.
              </p>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const lineupIds = new Set(data.lineup.map((p) => p.id));
  const benchPlayers = allPlayers.filter(
    (p) => playerIds.includes(p.id) && !lineupIds.has(p.id),
  );

  // Find the worst pick on the bench list to flag in the Verdict copy
  const doubtful =
    data.lineup.find((p) => p.status === 'd' || p.status === 'i') ?? null;

  // Net change: improvement vs the user's current XI (rough proxy: top-11 squad xP)
  const sortedSquadXp = [...allPlayers.filter((p) => playerIds.includes(p.id))]
    .map((p) => parseFloat(p.form || '0') * 0.6 + parseFloat(p.points_per_game || '0') * 0.4)
    .sort((a, b) => b - a)
    .slice(0, 11)
    .reduce((s, n) => s + n, 0);
  const delta = data.expectedPoints - sortedSquadXp;

  return (
    <ErrorBoundary fixtures={fixtures} teams={teams}>
      <CacheHandler data={data} />

      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <AppNav />

        <div className="px-6 sm:px-10 lg:px-14 py-7">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <BroadsheetMasthead
              data={data}
              gameweek={nextEvent?.id}
              deadline={formatDeadline(nextEvent?.deadline_time)}
            />

            {data.partial && (
              <div
                className="px-4 py-3 font-serif italic text-sm"
                style={{
                  border: '1px solid var(--red-rule)',
                  background: 'var(--paper-hi)',
                  color: 'var(--ink)',
                }}
              >
                <strong className="font-extrabold not-italic">Partial lineup.</strong> Some pitch
                slots are empty because squad players are unavailable (injured, doubtful, suspended)
                or have no fixture in this gameweek.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Main column */}
              <div>
                <SectionHeader
                  eyebrow="The starting XI"
                  title="What the maths picked"
                  subtitle={
                    <>A {data.formation} side projected to bag{' '}
                      {data.expectedPoints.toFixed(1)} points. Captain&apos;s armband on{' '}
                      <span className="font-extrabold not-italic">
                        {data.captain?.web_name ?? 'tbc'}
                      </span>{' '}
                      — the only sensible read.
                    </>
                  }
                />
                <div className="mt-5">
                  <FormationPitch
                    lineup={data.lineup}
                    captain={data.captain}
                    formation={data.formation}
                    fixtures={fixtures}
                    teams={teams}
                    bench={benchPlayers}
                  />
                </div>
              </div>

              {/* Sidebar: Verdict above Transfer Targets */}
              <div className="flex flex-col gap-5">
                <VerdictCard captain={data.captain} delta={delta} doubtful={doubtful} />
                <TransferTargets
                  allPlayers={allPlayers}
                  lineup={data.lineup}
                  squadIds={playerIds}
                  fixtures={fixtures}
                  teams={teams}
                />
              </div>
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

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-mute)]">
        {eyebrow}
      </p>
      <h2 className="font-serif font-extrabold text-[40px] sm:text-[44px] leading-none tracking-[-0.03em] text-[var(--ink)] mt-1.5">
        {title}
      </h2>
      {subtitle && (
        <p className="font-serif italic text-base mt-2 leading-[1.4] max-w-[540px] text-[var(--ink-soft)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
