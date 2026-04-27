import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/dashboard/actions';

export async function AppNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <Image src="/wizard-icon.png" alt="" width={26} height={26} unoptimized />
        <span className="font-black text-white text-lg tracking-tight">FootyWizard</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/team"
          className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block"
        >
          My Squad
        </Link>
        <Link
          href="/history"
          className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block"
        >
          History
        </Link>
        {user && (
          <span className="text-xs text-slate-500 hidden md:block truncate max-w-[180px]">
            {user.email}
          </span>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  );
}
