'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type SaveSquadState = { error: string } | null;

export async function saveSquad(playerIds: number[]): Promise<SaveSquadState> {
  if (playerIds.length !== 15) {
    return { error: 'Select exactly 15 players before saving.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_squads')
    .upsert(
      { user_id: user.id, player_ids: playerIds, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[saveSquad] Supabase error:', error.message);
    return { error: 'Failed to save squad. Please try again.' };
  }

  redirect('/dashboard');
}
