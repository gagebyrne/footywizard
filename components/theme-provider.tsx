'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { WizardBall } from './wizard-ball';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'footywizard-theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const fromAttr = document.documentElement.getAttribute('data-theme');
  if (fromAttr === 'dark' || fromAttr === 'light') return fromAttr;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore — private mode etc.
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 border border-[var(--ink)] bg-transparent text-[var(--ink)] font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 cursor-pointer hover:bg-[var(--paper-hi)] transition-colors ${className ?? ''}`}
      title="Toggle theme"
      aria-label="Toggle dark mode"
    >
      <span
        aria-hidden
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: theme === 'dark' ? 'var(--grass)' : 'var(--ink)' }}
      />
      {theme === 'dark' ? 'Floodlights on' : 'Day edition'}
    </button>
  );
}

export { WizardBall };

/**
 * Inline script string. Render once in the <head> via dangerouslySetInnerHTML
 * so the data-theme attribute is in place before React hydrates.
 */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='dark'||s==='light'){document.documentElement.setAttribute('data-theme',s);}}catch(_){}})();`;
