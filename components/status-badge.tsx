'use client';

interface StatusBadgeProps {
  status: string;
  inline?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string } | undefined> = {
  d: { label: 'D', className: 'bg-amber-500/80 text-amber-950 border-amber-400' },
  i: { label: 'I', className: 'bg-red-500/80 text-red-100 border-red-400' },
  u: { label: 'U', className: 'bg-slate-500/80 text-slate-200 border-slate-400' },
};

export function StatusBadge({ status, inline = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  if (inline) {
    return (
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black border leading-none ${config.className}`}
        title={status === 'd' ? 'Doubtful' : status === 'i' ? 'Injured' : 'Unavailable'}
      >
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`absolute bottom-1 right-1 z-10 inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black border leading-none ${config.className}`}
      title={status === 'd' ? 'Doubtful' : status === 'i' ? 'Injured' : 'Unavailable'}
    >
      {config.label}
    </span>
  );
}
