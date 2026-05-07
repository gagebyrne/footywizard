'use client';

import { useState, useEffect } from 'react';
import type { PredictionRecord } from '@/lib/history/predictions';

interface Props {
  initialPredictions: PredictionRecord[];
}

function calculateError(record: PredictionRecord): number | null {
  if (record.totalActualPoints === undefined) return null;
  return Math.abs(record.totalExpectedPoints - record.totalActualPoints);
}

function verdictFor(err: number | null): { label: string; fill: string; ink: string } | null {
  if (err === null) return null;
  if (err <= 5) return { label: 'On the money', fill: 'var(--grass)', ink: 'var(--captain-ink)' };
  if (err <= 10) return { label: 'Close enough', fill: '#C9A227', ink: '#16140F' };
  return { label: 'Talked rubbish', fill: 'var(--red-rule)', ink: 'var(--captain-ink)' };
}

export function HistoryTable({ initialPredictions }: Props) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [loadingGws, setLoadingGws] = useState<Set<number>>(new Set());
  const [errorGws, setErrorGws] = useState<Set<number>>(new Set());

  useEffect(() => {
    const unbackfilled = predictions
      .filter((r) => r.totalActualPoints === undefined)
      .map((r) => r.gameweek)
      .sort((a, b) => a - b);

    if (unbackfilled.length === 0) return;

    let cancelled = false;

    async function runBackfill() {
      for (const gw of unbackfilled) {
        if (cancelled) break;

        setLoadingGws((prev) => new Set([...prev, gw]));

        try {
          const res = await fetch('/api/history/backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameweek: gw }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const updated: PredictionRecord = await res.json();

          if (!cancelled) {
            setPredictions((prev) => prev.map((p) => (p.gameweek === gw ? updated : p)));
          }
        } catch {
          if (!cancelled) {
            setErrorGws((prev) => new Set([...prev, gw]));
          }
        } finally {
          if (!cancelled) {
            setLoadingGws((prev) => {
              const next = new Set(prev);
              next.delete(gw);
              return next;
            });
          }
        }
      }
    }

    runBackfill();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...predictions].sort((a, b) => b.gameweek - a.gameweek);

  return (
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
          {predictions.filter((p) => p.totalActualPoints !== undefined).length}/{predictions.length}{' '}
          settled
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
              const isLoading = loadingGws.has(record.gameweek);
              const hasError = errorGws.has(record.gameweek);
              const err = calculateError(record);
              const has = record.totalActualPoints !== undefined;
              const verdict = verdictFor(err);

              return (
                <tr
                  key={record.gameweek}
                  style={{
                    borderBottom:
                      i === sorted.length - 1 ? 'none' : '1px solid var(--paper-lo)',
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
                      color:
                        record.fplExpectedPoints != null ? 'var(--ink-soft)' : 'var(--ink-mute)',
                      padding: '12px 16px',
                      textAlign: 'right',
                    }}
                  >
                    {record.fplExpectedPoints != null
                      ? record.fplExpectedPoints.toFixed(1)
                      : '—'}
                  </td>
                  <td
                    className="font-serif font-extrabold text-base"
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                    }}
                  >
                    {isLoading ? (
                      <span
                        className="inline-block w-10 h-4 animate-pulse rounded-sm"
                        style={{ background: 'var(--paper-lo)' }}
                      />
                    ) : hasError ? (
                      <span
                        className="font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--red-rule)' }}
                      >
                        error
                      </span>
                    ) : (
                      <span style={{ color: has ? 'var(--grass)' : 'var(--ink-mute)' }}>
                        {has ? record.totalActualPoints!.toFixed(1) : '—'}
                      </span>
                    )}
                  </td>
                  <td
                    className="font-mono text-sm"
                    style={{
                      color: 'var(--ink)',
                      padding: '12px 16px',
                      textAlign: 'right',
                    }}
                  >
                    {isLoading ? (
                      <span
                        className="inline-block w-8 h-4 animate-pulse rounded-sm"
                        style={{ background: 'var(--paper-lo)' }}
                      />
                    ) : (
                      (err !== null ? err.toFixed(1) : '—')
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isLoading ? (
                      <span
                        className="inline-block w-16 h-4 animate-pulse rounded-sm"
                        style={{ background: 'var(--paper-lo)' }}
                      />
                    ) : verdict ? (
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
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
