import Link from 'next/link';
import { WizardBall } from '@/components/wizard-ball';
import { ThemeToggle } from '@/components/theme-provider';

const features = [
  {
    kicker: 'Optimisation',
    title: 'The maths picks the side',
    body:
      'An integer programming solver runs every legal XI from your fifteen, then names the captain. It does not have a favourite.',
  },
  {
    kicker: 'Fixtures',
    title: 'Three weeks ahead',
    body:
      'Difficulty-graded opposition for every player you own, position-aware. Spot the easy run before the bandwagon does.',
  },
  {
    kicker: 'Transfers',
    title: 'Rank, not rumour',
    body:
      'The eight names worth your free transfer, sorted by expected points. No talkSPORT phone-ins required.',
  },
  {
    kicker: 'Receipts',
    title: 'We mark our own homework',
    body:
      'Every prediction is logged. MAE, captain hit-rate, Pearson r — the lot. We are wrong sometimes. We tell you when.',
  },
];

const errorSeries = [6.1, 5.4, 4.8, 5.9, 4.2, 3.8, 5.2, 4.4, 3.9, 4.6];

const errorPoints = errorSeries.map((v, i, arr) => ({
  x: (i / (arr.length - 1)) * 196 + 2,
  y: 70 - v * 6,
}));

const errorLinePath = errorPoints
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
  .join(' ');

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-8 sm:px-12 lg:px-20 py-7 pb-10">
      <div className="max-w-7xl mx-auto">

        {/* Masthead nav */}
        <div
          className="flex items-center justify-between py-4"
          style={{
            borderTop: '3px solid var(--ink)',
            borderBottom: '1px solid var(--ink)',
            ['--ball-cut' as string]: 'var(--paper)',
          }}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <WizardBall size={32} />
            <span className="font-serif font-extrabold text-2xl tracking-[-0.025em]">FootyWizard</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <ThemeToggle />
            <Link
              href="/login"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors hidden sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="font-mono text-[11px] uppercase tracking-[0.14em] bg-[var(--ink)] text-[var(--paper)] px-3.5 py-2 hover:opacity-90 transition-opacity"
            >
              Get the form book →
            </Link>
          </div>
        </div>

        {/* Hero grid */}
        <div className="pt-12 sm:pt-16 pb-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-14 items-center">
          <div>
            <p
              className="landing-item font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-mute)]"
              style={{ animation: 'landing-enter 0.6s ease-out 0.1s both' }}
            >
              Volume XXI · Gameweek 21 · Saturday Edition
            </p>
            <h1
              className="landing-item font-serif font-extrabold leading-[0.86] tracking-[-0.045em] mt-3.5 text-[64px] sm:text-[88px] lg:text-[110px]"
              style={{ animation: 'landing-enter 0.6s ease-out 0.2s both' }}
            >
              Stop guessing.<br />
              <span className="italic font-bold text-[var(--grass)]">Start solving.</span>
            </h1>
            <p
              className="landing-item font-serif italic text-[var(--ink-soft)] leading-[1.4] mt-5 max-w-[540px] text-lg sm:text-[22px]"
              style={{ animation: 'landing-enter 0.6s ease-out 0.38s both' }}
            >
              Football made magical. Feed FootyWizard your squad and a maths-obsessed solver returns the highest-scoring eleven, the right captain, and the one transfer you should actually make this week.
            </p>
            <div
              className="landing-item flex flex-wrap gap-3.5 mt-7"
              style={{ animation: 'landing-enter 0.6s ease-out 0.52s both' }}
            >
              <Link
                href="/login"
                className="font-mono text-xs uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)] px-5 py-3.5 hover:opacity-90 transition-opacity"
              >
                Optimise my XI →
              </Link>
              <Link
                href="/login"
                className="font-mono text-xs uppercase tracking-[0.16em] border border-[var(--ink)] text-[var(--ink)] px-5 py-3.5 hover:bg-[var(--paper-hi)] transition-colors"
              >
                Read the method
              </Link>
            </div>
          </div>

          {/* Prediction error card */}
          <div
            className="landing-item bg-[var(--paper-hi)] p-5"
            style={{
              border: '2px solid var(--ink)',
              animation: 'landing-enter 0.6s ease-out 0.35s both',
            }}
          >
            <p className="eyebrow">Last 10 gameweeks · prediction error</p>
            <div className="font-serif font-extrabold text-[30px] tracking-[-0.02em] mt-1 text-[var(--ink)]">
              MAE 4.6 pts
              <span className="font-serif italic text-sm font-medium text-[var(--ink-soft)] ml-2">
                (industry: ~7)
              </span>
            </div>
            <svg viewBox="0 0 200 80" className="w-full mt-3 block" preserveAspectRatio="none">
              <line x1="0" y1="40" x2="200" y2="40" stroke="var(--ink-mute)" strokeWidth="0.5" strokeDasharray="2 2" />
              <path
                d={errorLinePath}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="chart-line"
                style={{ strokeDasharray: 1000, animation: 'chart-line-draw 1s ease-out 0.6s both' }}
              />
              {errorPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={2.5}
                  fill={i === errorPoints.length - 1 ? 'var(--grass)' : 'var(--ink)'}
                  className="chart-dot"
                  style={{ animation: `chart-dot-enter 0.15s ease-out ${0.9 + i * 0.06}s both` }}
                />
              ))}
            </svg>
            <div
              className="flex justify-between mt-3.5 pt-3.5"
              style={{ borderTop: '1px solid var(--paper-lo)' }}
            >
              {[
                { label: 'Captain hits', value: '74%' },
                { label: 'Pearson r', value: '0.81' },
                { label: 'GWs solved', value: '21' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-mute)]">{s.label}</p>
                  <p className="font-serif font-extrabold text-[22px] text-[var(--ink)]">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div
          className="pt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderTop: '1px solid var(--ink)' }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="landing-item px-4 py-5 lg:py-0"
              style={{
                borderRight: i < features.length - 1 ? '1px solid var(--paper-lo)' : 'none',
                animation: `landing-enter 0.5s ease-out ${0.55 + i * 0.1}s both`,
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--grass)]">
                {f.kicker}
              </p>
              <h3 className="font-serif font-extrabold text-[22px] tracking-[-0.02em] leading-[1.1] mt-1.5 text-[var(--ink)]">
                {f.title}
              </h3>
              <p className="text-sm leading-[1.55] mt-2 text-[var(--ink-soft)]">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer
          className="mt-12 pt-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderTop: '3px solid var(--ink)' }}
        >
          <div className="flex items-center gap-2" style={{ ['--ball-cut' as string]: 'var(--paper)' }}>
            <WizardBall size={20} />
            <span className="font-serif font-extrabold tracking-tight text-[var(--ink)]">FootyWizard</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)]">
            Football made magical · updated every gameweek
          </p>
        </footer>
      </div>
    </div>
  );
}
