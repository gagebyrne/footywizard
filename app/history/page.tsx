import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPredictions, type PredictionRecord } from '@/lib/history/predictions';
import { calculateAggregateMetrics } from '@/lib/history/metrics';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';
import { HistoryChart } from '@/components/history-chart';
import { WizardBall } from '@/components/wizard-ball';

export const dynamic = 'force-dynamic';

interface AggregateMetrics {
  mae: number | null;
  captainHitRate: number | null;
  correlation: number | null;
  totalGameweeks: number;
  gameweeksWithActuals: number;
}

interface HistoryResponse {
  predictions: PredictionRecord[];
  metrics: AggregateMetrics;
}

async function fetchHistory(userId: string): Promise<HistoryResponse | null> {
  try {
    const predictions = await getPredictions(userId);
    const metrics = calculateAggregateMetrics(predictions);
    console.log('[history/page.tsx] History loaded', {
      predictionsCount: predictions.length,
      gameweeksWithActuals: metrics.gameweeksWithActuals,
    });
    return { predictions, metrics };
  } catch (error) {
    console.error('[history/page.tsx] Failed to load history:', error);
    return null;
  }
}

function formatMetric(value: number | null, digits = 1): string {
  return value !== null ? value.toFixed(digits) : '—';
}

function calculateError(record: PredictionRecord): number | null {
  if (record.totalActualPoints === undefined) return null;
  return Math.abs(record.totalExpectedPoints - record.totalActualPoints);
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchHistory(user.id);

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <AppNav />
        <div className="flex items-center justify-center py-32 px-4">
          <div
            className="text-center space-y-3 p-8 max-w-md"
            style={{ border: '2px solid var(--ink)', background: 'var(--paper-hi)' }}
          >
            <h1
              className="font-serif font-extrabold text-2xl"
              style={{ color: 'var(--red-rule)' }}
            >
              Failed to load history
            </h1>
            <p style={{ color: 'var(--ink-soft)' }} className="font-serif italic">
              Check that the API server is running and try again.
            </p>
            <Link
              href="/dashboard"
              className="inline-block font-mono text-xs uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              Back to the dugout →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { predictions, metrics } = data;

  if (predictions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <AppNav />
        <div className="px-6 sm:px-10 lg:px-14 py-16">
          <div className="max-w-[820px] mx-auto text-center space-y-6">
            <div
              className="mx-auto inline-block"
              style={{ ['--ball-cut' as string]: 'var(--paper)', color: 'var(--ink)' }}
            >
              <WizardBall size={56} />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-mute)]">
              The receipts column · awaiting first entry
            </p>
            <h1 className="font-serif font-extrabold text-[40px] sm:text-[64px] tracking-[-0.04em] leading-[0.92]">
              No predictions <span className="italic font-bold text-[var(--grass)]">filed yet.</span>
            </h1>
            <p className="font-serif italic text-lg text-[var(--ink-soft)] max-w-[520px] mx-auto">
              Generate your first lineup and we&apos;ll start logging the maths versus the matchday — so
              you can hold us to it.
            </p>
            <Link
              href="/dashboard"
              className="inline-block font-mono text-xs uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)] px-5 py-3.5 hover:opacity-90 transition-opacity"
            >
              Optimise my XI →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...predictions].sort((a, b) => b.gameweek - a.gameweek);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AppNav />

      <div className="px-6 sm:px-10 lg:px-14 py-7">
        <div className="max-w-[1200px] mx-auto space-y-8">
          {/* Masthead */}
          <header
            className="py-5"
            style={{
              borderTop: '3px solid var(--ink)',
              borderBottom: '1px solid var(--ink)',
              ['--ball-cut' as string]: 'var(--paper)',
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mb-2.5">
              The receipts column · {metrics.totalGameweeks} gameweek
              {metrics.totalGameweeks !== 1 ? 's' : ''} on the books · {metrics.gameweeksWithActuals}{' '}
              with actuals
            </p>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex items-end gap-3.5">
                <div className="hidden sm:block shrink-0">
                  <WizardBall size={52} />
                </div>
                <div>
                  <h1 className="font-serif font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[0.88] tracking-[-0.035em]">
                    We mark <span className="italic font-bold text-[var(--grass)]">our own</span> homework.
                  </h1>
                  <p className="font-serif italic text-base text-[var(--ink-soft)] mt-1.5 max-w-[520px]">
                    Every prediction logged. Every actual backfilled. No selective memory, no
                    rosy-tinted recap.
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Top-line stats */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)' }}
          >
            <BigStat
              eyebrow="Mean absolute error"
              value={formatMetric(metrics.mae)}
              suffix="pts"
              note="lower is better — industry hovers near 7"
              borderRight
            />
            <BigStat
              eyebrow="Captain hit rate"
              value={formatMetric(metrics.captainHitRate, 0)}
              suffix={metrics.captainHitRate !== null ? '%' : ''}
              note="captain outscored the median XI"
              borderRight
            />
            <BigStat
              eyebrow="Pearson r"
              value={formatMetric(metrics.correlation, 2)}
              note="predicted vs actual, 1.0 is perfect"
            />
          </div>

          {/* Chart */}
          <HistoryChart predictions={predictions} />

          {/* Table */}
          <div style={{ background: 'var(--paper-hi)', border: '2px solid var(--ink)' }}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--ink)' }}
            >
              <p className="font-serif italic text-xs" style={{ color: 'var(--ink-mute)' }}>
                from the archives
              </p>
              <h2 className="font-serif font-extrabold text-[22px] tracking-[-0.02em]">
                Gameweek ledger
              </h2>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em] hidden sm:block"
                style={{ color: 'var(--ink-mute)' }}
              >
                {metrics.gameweeksWithActuals}/{metrics.totalGameweeks} settled
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ink)' }}>
                    {['GW', 'Formation', 'Predicted', 'FPL xP', 'Actual', 'Error', 'Verdict'].map(
                      (h, i) => (
                        <th
                          key={h}
                          className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold"
                          style={{
                            color: 'var(--ink-mute)',
                            textAlign: i >= 2 && i <= 5 ? 'right' : 'left',
                            padding: '10px 16px',
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((record, i) => {
                    const err = calculateError(record);
                    const has = record.totalActualPoints !== undefined;
                    const verdict = verdictFor(err);
                    return (
                      <tr
                        key={record.gameweek}
                        style={{
                          borderBottom:
                            i === sorted.length - 1
                              ? 'none'
                              : '1px solid var(--paper-lo)',
                        }}
                      >
                        <td
                          className="font-serif font-extrabold text-lg"
                          style={{
                            color: 'var(--ink)',
                            padding: '12px 16px',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          GW{record.gameweek}
                        </td>
                        <td
                          className="font-mono text-xs"
                          style={{ color: 'var(--ink-soft)', padding: '12px 16px' }}
                        >
                          {record.formation || '—'}
                        </td>
                        <td
                          className="font-serif font-extrabold text-base"
                          style={{
                            color: 'var(--ink)',
                            padding: '12px 16px',
                            textAlign: 'right',
                          }}
                        >
                          {record.totalExpectedPoints.toFixed(1)}
                        </td>
                        <td
                          className="font-serif text-base"
                          style={{
                            color: record.fplExpectedPoints != null ? 'var(--ink-soft)' : 'var(--ink-mute)',
                            padding: '12px 16px',
                            textAlign: 'right',
                          }}
                        >
                          {record.fplExpectedPoints != null ? record.fplExpectedPoints.toFixed(1) : '—'}
                        </td>
                        <td
                          className="font-serif font-extrabold text-base"
                          style={{
                            color: has ? 'var(--grass)' : 'var(--ink-mute)',
                            padding: '12px 16px',
                            textAlign: 'right',
                          }}
                        >
                          {has ? record.totalActualPoints!.toFixed(1) : '—'}
                        </td>
                        <td
                          className="font-mono text-sm"
                          style={{
                            color: 'var(--ink)',
                            padding: '12px 16px',
                            textAlign: 'right',
                          }}
                        >
                          {err !== null ? err.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {verdict && (
                            <span
                              className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 inline-block"
                              style={{
                                background: verdict.fill,
                                color: verdict.ink,
                                fontWeight: 700,
                              }}
                            >
                              {verdict.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p
            className="font-serif italic text-sm text-center"
            style={{ color: 'var(--ink-mute)' }}
          >
            Actuals are backfilled the moment the gameweek finishes. Captain points double up,
            consistent with FPL rules.
          </p>
        </div>
      </div>
    </div>
  );
}

function BigStat({
  eyebrow,
  value,
  suffix,
  note,
  borderRight,
}: {
  eyebrow: string;
  value: string;
  suffix?: string;
  note: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className="px-5 sm:px-7 py-6 sm:py-7"
      style={{
        borderRight: borderRight ? '1px solid var(--paper-lo)' : undefined,
        borderBottom: borderRight ? '1px solid var(--paper-lo)' : undefined,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)]">
        {eyebrow}
      </p>
      <p className="font-serif font-extrabold text-[44px] sm:text-[52px] tracking-[-0.035em] leading-none mt-2 text-[var(--ink)]">
        {value}
        {suffix && (
          <span className="text-[0.4em] font-medium ml-1.5 text-[var(--ink-soft)]">{suffix}</span>
        )}
      </p>
      <p
        className="font-serif italic text-[13px] mt-2 leading-tight"
        style={{ color: 'var(--ink-soft)' }}
      >
        {note}
      </p>
    </div>
  );
}

function verdictFor(err: number | null): { label: string; fill: string; ink: string } | null {
  if (err === null) return null;
  if (err <= 5) return { label: 'On the money', fill: 'var(--grass)', ink: 'var(--captain-ink)' };
  if (err <= 10) return { label: 'Close enough', fill: '#C9A227', ink: '#16140F' };
  return { label: 'Talked rubbish', fill: 'var(--red-rule)', ink: 'var(--captain-ink)' };
}
