import type { Player } from '@/lib/types/fpl';

interface VerdictCardProps {
  captain: Player | null;
  delta: number;
  doubtful?: Player | null;
}

export function VerdictCard({ captain, delta, doubtful }: VerdictCardProps) {
  const captainName = captain?.web_name ?? 'your top scorer';
  const doubtName = doubtful?.web_name;
  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <div
      className="px-5 py-4"
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderTop: '3px solid var(--grass)',
      }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5"
        style={{ color: 'var(--grass)' }}
      >
        ◆ The verdict
      </div>
      <p className="font-serif font-semibold text-[18px] leading-[1.3] tracking-[-0.005em]">
        Captain <span className="font-extrabold">{captainName}</span>, hold the back three
        {doubtName ? (
          <>
            , and for goodness&apos; sake bench <span className="font-extrabold">{doubtName}</span> — he&apos;s
            a doubt and the fixture&apos;s a stinker.
          </>
        ) : (
          <>, and trust the maths.</>
        )}
      </p>
      <div
        className="mt-2.5 pt-2.5 flex justify-between items-baseline"
        style={{ borderTop: '1px solid rgba(126, 118, 101, 0.33)' }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: 'var(--ink-mute)' }}
        >
          Net change
        </span>
        <span
          className="font-serif italic font-extrabold text-[22px]"
          style={{ color: 'var(--grass)' }}
        >
          {deltaSign}
          {delta.toFixed(1)} pts
        </span>
      </div>
    </div>
  );
}
