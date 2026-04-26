import type { OptimizeResponse } from '@/lib/types/optimizer';
import type { Fixture, Team, Player } from '@/lib/types/fpl';
import { FormationPitch } from '@/components/formation-pitch';
import { TransferTargets } from '@/components/transfer-targets';
import { FixtureOutlook } from '@/components/fixture-outlook';

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

    return res.json();
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

export default async function Home() {
  // Fetch all data in parallel (async-parallel pattern from react-best-practices)
  const [data, fixtures, bootstrapData] = await Promise.all([
    fetchOptimization(),
    fetchFixtures(),
    fetchBootstrapData(),
  ]);

  const { teams, players } = bootstrapData;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <h1 className="text-2xl font-bold text-red-400">Failed to load lineup</h1>
          <p className="text-slate-300">Check that the API server is running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Stats */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-2xl">
            {data.expectedPoints.toFixed(1)}
            <span className="text-2xl ml-2 font-medium text-emerald-300">pts</span>
          </h1>
          <p className="text-lg font-medium text-slate-300">
            Expected Points • {data.formation}
          </p>
          <p className="text-sm text-slate-400">
            £{(data.constraints.budget.used / 10).toFixed(1)}m / £{data.constraints.budget.limit / 10}m
          </p>
        </div>

        {/* Responsive Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formation Pitch - spans 2 columns on desktop */}
          <div className="lg:col-span-2">
            <FormationPitch
              lineup={data.lineup}
              captain={data.captain}
              formation={data.formation}
              fixtures={fixtures}
              teams={teams}
            />
          </div>

          {/* Sidebar - Transfer Targets and Fixture Outlook stacked */}
          <div className="space-y-6">
            <TransferTargets
              allPlayers={players}
              lineup={data.lineup}
              fixtures={fixtures}
              teams={teams}
            />

            <FixtureOutlook
              lineup={data.lineup}
              fixtures={fixtures}
              teams={teams}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
