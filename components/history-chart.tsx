import type { PredictionRecord } from '@/lib/history/predictions';

interface HistoryChartProps {
  predictions: PredictionRecord[];
}

const W = 820;
const H = 300;
const PAD_L = 44;
const PAD_R = 14;
const PAD_T = 18;
const PAD_B = 36;

export function HistoryChart({ predictions }: HistoryChartProps) {
  const sorted = [...predictions].sort((a, b) => a.gameweek - b.gameweek);
  if (sorted.length === 0) return null;

  const xs = sorted.map((p) => p.gameweek);
  const minGW = Math.min(...xs);
  const maxGW = Math.max(...xs);
  const xRange = Math.max(1, maxGW - minGW);

  const allY = sorted.flatMap((p) =>
    [p.totalExpectedPoints, p.totalActualPoints].filter((v): v is number => typeof v === 'number'),
  );
  const yMaxRaw = Math.max(...allY, 1);
  const yMax = Math.ceil(yMaxRaw / 10) * 10;
  const yTicks = 4;
  const tickStep = yMax / yTicks;

  const xPos = (gw: number) =>
    PAD_L + ((gw - minGW) / xRange) * (W - PAD_L - PAD_R);
  const yPos = (v: number) => PAD_T + (1 - v / yMax) * (H - PAD_T - PAD_B);

  const predictedPath = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.gameweek)} ${yPos(p.totalExpectedPoints)}`)
    .join(' ');

  const withActuals = sorted.filter(
    (p): p is PredictionRecord & { totalActualPoints: number } =>
      typeof p.totalActualPoints === 'number',
  );
  const actualPath = withActuals
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.gameweek)} ${yPos(p.totalActualPoints)}`)
    .join(' ');

  return (
    <div
      className="p-5 sm:p-6 bg-[var(--paper-hi)]"
      style={{ border: '2px solid var(--ink)' }}
    >
      <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-mute)]">
            Season ledger · gameweek by gameweek
          </p>
          <h2 className="font-serif font-extrabold text-[28px] tracking-[-0.025em] leading-none mt-1.5">
            Predicted vs actual
          </h2>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          style={{ minWidth: 540 }}
          role="img"
          aria-label="Predicted versus actual points by gameweek"
        >
          {/* Y gridlines + labels */}
          {Array.from({ length: yTicks + 1 }, (_, i) => i * tickStep).map((v) => {
            const y = yPos(v);
            return (
              <g key={v}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="var(--ink-mute)"
                  strokeWidth={0.5}
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD_L - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                  fill="var(--ink-mute)"
                  letterSpacing="0.08em"
                >
                  {v.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X axis ticks */}
          {sorted.map((p) => {
            const x = xPos(p.gameweek);
            return (
              <text
                key={`x-${p.gameweek}`}
                x={x}
                y={H - PAD_B + 16}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fill="var(--ink-mute)"
                letterSpacing="0.06em"
              >
                GW{p.gameweek}
              </text>
            );
          })}

          {/* Axis lines */}
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={H - PAD_B}
            y2={H - PAD_B}
            stroke="var(--ink)"
            strokeWidth={1}
          />
          <line
            x1={PAD_L}
            x2={PAD_L}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="var(--ink)"
            strokeWidth={1}
          />

          {/* Predicted line (ink) — draws in first */}
          <path
            d={predictedPath}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            className="chart-line"
            style={{ strokeDasharray: 2000, animation: 'chart-line-draw 1.2s ease-out 0.1s both' }}
          />
          {sorted.map((p, i) => (
            <circle
              key={`pred-${p.gameweek}`}
              cx={xPos(p.gameweek)}
              cy={yPos(p.totalExpectedPoints)}
              r={3}
              fill="var(--paper-hi)"
              stroke="var(--ink)"
              strokeWidth={1.4}
              className="chart-dot"
              style={{ animation: `chart-dot-enter 0.2s ease-out ${0.3 + i * 0.07}s both` }}
            />
          ))}

          {/* Actual line (grass) — draws in after predicted */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="var(--grass)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              className="chart-line"
              style={{ strokeDasharray: 2000, animation: 'chart-line-draw 1.2s ease-out 0.5s both' }}
            />
          )}
          {withActuals.map((p, i) => (
            <circle
              key={`act-${p.gameweek}`}
              cx={xPos(p.gameweek)}
              cy={yPos(p.totalActualPoints)}
              r={3.4}
              fill="var(--grass)"
              stroke="var(--paper-hi)"
              strokeWidth={1.2}
              className="chart-dot"
              style={{ animation: `chart-dot-enter 0.2s ease-out ${0.7 + i * 0.07}s both` }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        <span
          aria-hidden
          className="inline-block"
          style={{ width: 22, height: 1.6, background: 'var(--ink)' }}
        />
        Predicted
      </span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        <span
          aria-hidden
          className="inline-block"
          style={{ width: 22, height: 2.2, background: 'var(--grass)' }}
        />
        Actual
      </span>
    </div>
  );
}
