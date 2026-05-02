'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/dashboard/actions';

interface MobileNavProps {
  email?: string;
}

export function MobileNav({ email }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="flex flex-col justify-center items-center cursor-pointer p-1"
        style={{ width: 28, height: 28, gap: 5 }}
      >
        <span
          className="block"
          style={{
            width: 18,
            height: 2,
            background: 'var(--ink)',
            transition: 'transform 0.18s ease, opacity 0.18s ease',
            transformOrigin: 'center',
            transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
          }}
        />
        <span
          className="block"
          style={{
            width: 18,
            height: 2,
            background: 'var(--ink)',
            transition: 'opacity 0.18s ease',
            opacity: open ? 0 : 1,
          }}
        />
        <span
          className="block"
          style={{
            width: 18,
            height: 2,
            background: 'var(--ink)',
            transition: 'transform 0.18s ease',
            transformOrigin: 'center',
            transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
          }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop — closes menu on outside tap */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown panel — positioned relative to <nav> (which is `relative`) */}
          <div
            className="absolute left-0 right-0 top-full z-50 bg-[var(--paper)]"
            style={{ borderBottom: '2px solid var(--ink)' }}
          >
            {email && (
              <div
                className="px-6 py-3 font-mono text-[10px] tracking-[0.1em] truncate"
                style={{ color: 'var(--ink-mute)', borderBottom: '1px solid var(--paper-lo)' }}
              >
                {email}
              </div>
            )}

            {(
              [
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/team', label: 'My squad' },
                { href: '/history', label: 'History' },
              ] as const
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-[var(--paper-hi)] transition-colors"
                style={{ color: 'var(--ink-soft)', borderBottom: '1px solid var(--paper-lo)' }}
              >
                {link.label}
              </Link>
            ))}

            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
