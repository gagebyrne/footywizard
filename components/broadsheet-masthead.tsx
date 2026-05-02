import type { OptimizeResponse } from '@/lib/types/optimizer';
import { WizardBall } from './wizard-ball';

interface BroadsheetMastheadProps {
  data: OptimizeResponse;
  gameweek?: number | null;
  deadline?: string | null;
}

export function BroadsheetMasthead({ data, gameweek, deadline }: BroadsheetMastheadProps) {
  const squadValue = (data.constraints?.budget?.used ?? 0) / 10;
  return (
    <header
      className="bg-[var(--paper)] text-[var(--ink)] py-5"
      style={{
        borderTop: '3px solid var(--ink)',
        borderBottom: '1px solid var(--ink)',
        ['--ball-cut' as string]: 'var(--paper)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-mute)]">
          Vol. XXI · Gameweek {gameweek ?? '—'} · Deadline {deadline ?? 'TBC'}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-mute)] hidden sm:block">
          The Form Book — Saturday Edition
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-3.5">
          <div className="hidden sm:block shrink-0">
            <WizardBall size={56} />
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[0.88] tracking-[-0.035em] text-[var(--ink)]">
              FootyWizard
            </h1>
            <p className="font-serif italic text-base text-[var(--ink-soft)] mt-1">
              Football made magical.
            </p>
          </div>
        </div>
        <div className="flex gap-7 sm:gap-9 items-end">
          <Stat
            label="Projected"
            value={data.expectedPoints.toFixed(1)}
            suffix="pts"
          />
          <Stat label="Formation" value={data.formation} />
          <Stat label="Squad value" value={`£${squadValue.toFixed(1)}`} suffix="m" />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mb-0.5">
        {label}
      </p>
      <p className="font-serif font-extrabold text-[32px] sm:text-[36px] tracking-[-0.03em] leading-none text-[var(--ink)]">
        {value}
        {suffix && (
          <span className="text-[0.55em] font-medium ml-1 text-[var(--ink-soft)]">{suffix}</span>
        )}
      </p>
    </div>
  );
}
