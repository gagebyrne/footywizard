'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { PlayerPortrait } from './player-portrait';
import { posLabel } from './chalk-player';
import { teamColor } from '@/lib/team-colors';

interface ChalkBenchRowProps {
  bench: Player[];
  fixtures: Fixture[];
  teams: Team[];
}

function calcXP(p: Player) {
  return parseFloat(p.form || '0') * 0.6 + parseFloat(p.points_per_game || '0') * 0.4;
}

export function ChalkBenchRow({ bench, teams }: ChalkBenchRowProps) {
  return (
    <div
      className="mt-5 py-3.5 flex items-stretch gap-4 bg-[var(--paper)]"
      style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)' }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center"
        style={{
          color: 'var(--ink-mute)',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
      >
        On the bench
      </div>
      <div className="flex gap-3 flex-1 min-w-0 overflow-x-auto">
        {bench.map((p) => {
          const team = teams.find((t) => t.id === p.team);
          const price = (p.now_cost ?? 0) / 10;
          const xp = calcXP(p);
          const portraitBg = teamColor(team?.short_name)?.primary ?? null;
          return (
            <div
              key={p.id}
              className="flex-1 min-w-[180px] flex items-center gap-2.5 pl-3"
              style={{ borderLeft: '1px solid var(--paper-lo)' }}
            >
              <PlayerPortrait player={p} size={36} background={portraitBg} />
              <div className="min-w-0">
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.14em]"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  {team?.short_name ?? '—'} · {posLabel(p.element_type)}
                </div>
                <div
                  className="font-serif font-extrabold text-lg tracking-tight mt-0.5 truncate"
                  style={{ color: 'var(--ink)' }}
                >
                  {p.web_name}
                </div>
                <div
                  className="font-mono text-[11px] mt-0.5"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  {xp.toFixed(1)} xP · £{price.toFixed(1)}m
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
