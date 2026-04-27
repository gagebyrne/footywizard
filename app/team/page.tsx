import { redirect } from 'next/navigation';
import FplFetch from 'fpl-fetch';
import { AppNav } from '@/components/app-nav';
import { TeamBuilder } from '@/components/team-builder';
import { createClient } from '@/lib/supabase/server';
import type { Player, Team } from '@/lib/types/fpl';

export const dynamic = 'force-dynamic';

const fpl = new FplFetch();

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [bootstrapData, squadData] = await Promise.all([
    fpl.getBootstrapData(),
    supabase.from('user_squads').select('player_ids').eq('user_id', user.id).maybeSingle(),
  ]);

  const allPlayers: Player[] = bootstrapData.elements ?? [];
  const teams: Team[] = bootstrapData.teams ?? [];
  const initialSquadIds: number[] = squadData.data?.player_ids ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900">
      <AppNav />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-black text-white">
              {initialSquadIds.length >= 15 ? 'My Squad' : 'Build Your Squad'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {initialSquadIds.length >= 15
                ? 'Manage your 15-player squad for the season.'
                : 'Pick 2 GK · 5 DEF · 5 MID · 3 FWD to get started.'}
            </p>
          </header>
          <TeamBuilder allPlayers={allPlayers} teams={teams} initialSquadIds={initialSquadIds} />
        </div>
      </div>
    </div>
  );
}
