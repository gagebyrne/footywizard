'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signIn, signUp, type AuthState } from './actions';
import { WizardBall } from '@/components/wizard-ball';
import { ThemeToggle } from '@/components/theme-provider';

const initialState: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);

  const isSignIn = mode === 'signin';
  const state = isSignIn ? signInState : signUpState;
  const action = isSignIn ? signInAction : signUpAction;
  const pending = isSignIn ? signInPending : signUpPending;

  const eyebrow = isSignIn ? 'Members’ gate' : 'New subscriber';
  const subhead = isSignIn
    ? 'Your XI is on the team-sheet — sign in and pick the side.'
    : 'Five minutes, one email, and the maths starts working for you.';

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      {/* Masthead */}
      <div
        className="px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between"
        style={{
          borderTop: '3px solid var(--ink)',
          borderBottom: '1px solid var(--ink)',
          ['--ball-cut' as string]: 'var(--paper)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <WizardBall size={28} />
          <span className="font-serif font-extrabold text-xl tracking-[-0.025em]">FootyWizard</span>
        </Link>
        <div className="flex items-center gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-mute)] hidden sm:block">
            Vol. XXI · The Saturday Edition
          </p>
          <ThemeToggle />
        </div>
      </div>

      {/* Body */}
      <main className="flex-1 px-6 sm:px-10 lg:px-14 py-12 sm:py-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left column — editorial */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-mute)]">
              {eyebrow} · {isSignIn ? 'kickoff in 3' : 'the form book awaits'}
            </p>
            <h1 className="font-serif font-extrabold leading-[0.92] tracking-[-0.045em] mt-3 text-[56px] sm:text-[72px] lg:text-[84px]">
              {isSignIn ? (
                <>
                  Step into <br />
                  the <span className="italic font-bold text-[var(--grass)]">dugout.</span>
                </>
              ) : (
                <>
                  Pull up <br />
                  a <span className="italic font-bold text-[var(--grass)]">chair.</span>
                </>
              )}
            </h1>
            <p className="font-serif italic text-lg sm:text-xl text-[var(--ink-soft)] mt-5 leading-[1.45] max-w-[460px]">
              {subhead}
            </p>

            <div
              className="mt-8 pt-5 grid grid-cols-3 gap-5 max-w-[460px]"
              style={{ borderTop: '1px solid var(--paper-lo)' }}
            >
              <Vital label="MAE" value="4.6" suffix="pts" />
              <Vital label="Captain hits" value="74" suffix="%" />
              <Vital label="GWs solved" value="21" />
            </div>
          </div>

          {/* Right column — auth card */}
          <div
            className="p-6 sm:p-7 bg-[var(--paper-hi)]"
            style={{ border: '2px solid var(--ink)' }}
          >
            {/* Mode toggle — newspaper-style segmented */}
            <div
              className="flex"
              style={{
                border: '1px solid var(--ink)',
                background: 'var(--paper)',
              }}
              role="tablist"
            >
              <ModeTab active={isSignIn} onClick={() => setMode('signin')} label="Sign in" />
              <ModeTab active={!isSignIn} onClick={() => setMode('signup')} label="New account" />
            </div>

            {/* Banner messages */}
            {signUpState?.message && (
              <p
                className="mt-4 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{
                  border: '1px solid var(--grass)',
                  color: 'var(--grass)',
                  background: 'transparent',
                }}
                role="status"
              >
                {signUpState.message}
              </p>
            )}
            {state?.error && (
              <p
                className="mt-4 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{
                  border: '1px solid var(--red-rule)',
                  color: 'var(--red-rule)',
                }}
                role="alert"
              >
                {state.error}
              </p>
            )}

            <form action={action} className="mt-5 space-y-4">
              <Field
                id="email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Field
                id="password"
                name="password"
                type="password"
                label="Password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                placeholder={isSignIn ? '••••••••' : 'At least 8 characters'}
              />
              {!isSignIn && (
                <Field
                  id="confirm"
                  name="confirm"
                  type="password"
                  label="Confirm password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full font-mono text-xs uppercase tracking-[0.16em] px-5 py-3.5 mt-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: '1px solid var(--ink)',
                }}
              >
                {pending
                  ? isSignIn
                    ? 'Signing in…'
                    : 'Creating account…'
                  : isSignIn
                    ? 'Take your seat →'
                    : 'Pick up the team-sheet →'}
              </button>
            </form>

            <p
              className="mt-5 pt-4 font-serif italic text-[13px] text-center text-[var(--ink-soft)]"
              style={{ borderTop: '1px solid var(--paper-lo)' }}
            >
              {isSignIn ? "Don't have an account? " : 'Already a regular? '}
              <button
                type="button"
                onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
                className="font-serif italic font-extrabold text-[var(--ink)] hover:text-[var(--grass)] transition-colors underline-offset-2 underline"
              >
                {isSignIn ? 'Subscribe' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ borderTop: '1px solid var(--ink)' }}
      >
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
        >
          ← Back to the front page
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)]">
          Football made magical
        </p>
      </footer>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 font-mono text-[11px] uppercase tracking-[0.16em] py-2.5 cursor-pointer transition-colors"
      style={{
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-soft)',
      }}
    >
      {label}
    </button>
  );
}

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] block text-[var(--ink-mute)]"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="w-full font-sans text-sm px-3 py-2.5 outline-none transition-colors bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--ink-mute)] focus:bg-[var(--paper-hi)]"
        style={{ border: '1.5px solid var(--ink)' }}
      />
    </div>
  );
}

function Vital({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-mute)]">
        {label}
      </p>
      <p className="font-serif font-extrabold text-[26px] tracking-[-0.02em] leading-none mt-1 text-[var(--ink)]">
        {value}
        {suffix && (
          <span className="text-[0.45em] font-medium text-[var(--ink-soft)] ml-0.5">{suffix}</span>
        )}
      </p>
    </div>
  );
}
