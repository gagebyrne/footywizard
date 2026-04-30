import { redirect } from 'next/navigation';
import FplFetch from 'fpl-fetch';
import { AppNav } from '@/components/app-nav';
import { TeamBuilder } from '@/components/team-builder';
import { WizardBall } from '@/components/wizard-ball';
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

  const isExisting = initialSquadIds.length >= 15;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <AppNav />

      {/* Masthead */}
      <header
        className="px-6 sm:px-10 lg:px-14 py-5"
        style={{
          borderBottom: '1px solid var(--ink)',
          ['--ball-cut' as string]: 'var(--paper)',
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-mute)] mb-2">
            The team sheet · 2 GK · 5 DEF · 5 MID · 3 FWD · max 3 per club
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-3">
              <WizardBall size={42} />
              <h1 className="font-serif font-extrabold text-[40px] sm:text-[52px] leading-[0.9] tracking-[-0.035em]">
                {isExisting ? (
                  <>
                    Manage <span className="italic font-bold text-[var(--grass)]">your fifteen.</span>
                  </>
                ) : (
                  <>
                    Pick <span className="italic font-bold text-[var(--grass)]">the side.</span>
                  </>
                )}
              </h1>
            </div>
            <p className="font-serif italic text-[var(--ink-soft)] max-w-[440px]">
              {isExisting
                ? 'Sub the dead wood, hold the form picks. Save when the fifteen reads right.'
                : 'Fifteen names, £100m, no patriotic favouritism. Get it right and the maths takes over.'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <TeamBuilder allPlayers={allPlayers} teams={teams} initialSquadIds={initialSquadIds} />
      </div>
    </div>
  );
}
