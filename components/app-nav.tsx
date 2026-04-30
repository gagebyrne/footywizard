import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/dashboard/actions';
import { WizardBall } from './wizard-ball';
import { ThemeToggle } from './theme-provider';

export async function AppNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav
      className="flex items-center justify-between px-6 py-3.5 bg-[var(--paper)] text-[var(--ink)]"
      style={{
        borderTop: '3px solid var(--ink)',
        borderBottom: '1px solid var(--ink)',
        ['--ball-cut' as string]: 'var(--paper)',
      }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <WizardBall size={28} />
        <span className="font-serif font-extrabold text-xl tracking-tight">FootyWizard</span>
      </Link>

      <div className="flex items-center gap-4">
        <Link
          href="/team"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors hidden sm:block"
        >
          My squad
        </Link>
        <Link
          href="/history"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors hidden sm:block"
        >
          History
        </Link>
        <ThemeToggle />
        {user && (
          <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--ink-mute)] hidden md:block truncate max-w-[180px]">
            {user.email}
          </span>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="font-mono text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
