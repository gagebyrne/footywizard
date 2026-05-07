import { NextRequest, NextResponse } from 'next/server';
import { backfillActuals } from '@/lib/history/predictions';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gameweek } = body;

    if (typeof gameweek !== 'number' || !Number.isInteger(gameweek) || gameweek < 1) {
      return NextResponse.json({ error: 'gameweek must be a positive integer' }, { status: 400 });
    }

    const record = await backfillActuals(user.id, gameweek);
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Backfill API] Request failed', { error: message });
    return NextResponse.json(
      { error: 'Failed to backfill actuals', details: message },
      { status: 500 }
    );
  }
}
