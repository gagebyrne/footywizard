'use client';

import { useState } from 'react';
import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { PlayerPortrait } from './player-portrait';
import { teamColor } from '@/lib/team-colors';

interface ChalkPlayerProps {
  player: Player;
  isCaptain: boolean;
  xp: number;
  fixtures: Fixture[];
  teams: Team[];
  hovered: boolean;
  onHover: (id: number | null) => void;
}

interface FixtureRow {
  opp: string;
  home: boolean;
  diff: number;
}

function nextThreeFixtures(player: Player, fixtures: Fixture[], teams: Team[]): FixtureRow[] {
  return fixtures
    .filter(
      (f) =>
        (f.team_h === player.team || f.team_a === player.team) && !f.finished && f.event !== null,
    )
    .sort((a, b) => {
      if (a.event !== b.event) return (a.event || 999) - (b.event || 999);
      return new Date(a.kickoff_time || '').getTime() - new Date(b.kickoff_time || '').getTime();
    })
    .slice(0, 3)
    .map((f) => {
      const home = f.team_h === player.team;
      const oppId = home ? f.team_a : f.team_h;
      const opp = teams.find((t) => t.id === oppId)?.short_name ?? 'TBD';
      const diff = (home ? f.team_h_difficulty : f.team_a_difficulty) ?? 3;
      return { opp, home, diff };
    });
}

export function diffStyle(d: number): { fill: string; ink: string } {
  if (d <= 2) return { fill: 'var(--grass)', ink: 'var(--captain-ink)' };
  if (d === 3) return { fill: '#C9A227', ink: '#16140F' };
  return { fill: 'var(--red-rule)', ink: 'var(--captain-ink)' };
}

export function ChalkPlayer({
  player,
  isCaptain,
  xp,
  fixtures,
  teams,
  hovered,
  onHover,
}: ChalkPlayerProps) {
  const [touched, setTouched] = useState(false);
  const open = hovered || touched;

  const fx = nextThreeFixtures(player, fixtures, teams);
  const status = player.status;
  const showStatusDot = status === 'd' || status === 'i' || status === 'u';
  const dotColor = status === 'i' || status === 'u' ? 'var(--red-rule)' : '#C9A227';

  const teamShort = teams.find((t) => t.id === player.team)?.short_name ?? null;
  const tc = teamColor(teamShort);
  const portraitBg = tc?.primary ?? null;

  const formScore = parseFloat(player.form || '0');
  const price = (player.now_cost ?? 0) / 10;

  return (
    <div
      onMouseEnter={() => onHover(player.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => setTouched((v) => !v)}
      className="relative flex flex-col items-center cursor-pointer select-none"
    >
      {isCaptain && (
        <div
          className="captain-badge absolute -top-2.5 -right-2 z-10 grid place-items-center font-serif italic font-extrabold"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '2px solid var(--ink)',
            fontSize: 13,
            boxShadow: '0 2px 0 rgba(0,0,0,0.3)',
            animation: 'captain-pulse 2.5s ease-in-out 2s infinite',
            transformOrigin: 'center',
          }}
        >
          C
        </div>
      )}

      <div
        className="relative grid place-items-center transition-all"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: portraitBg ?? 'var(--paper)',
          border: '2px solid var(--chalk)',
          boxShadow: open
            ? '0 0 0 3px var(--grass), 0 6px 18px rgba(0,0,0,0.45)'
            : '0 4px 10px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <PlayerPortrait player={player} size={52} background={portraitBg} />
        {showStatusDot && (
          <div
            className="absolute"
            style={{
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: dotColor,
              border: '2px solid var(--paper)',
            }}
          />
        )}
      </div>

      <div
        className="mt-1.5 font-sans font-bold text-[11px] tracking-wide whitespace-nowrap"
        style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '2px 8px' }}
      >
        {player.web_name}
      </div>
      <div
        className="mt-1 font-mono text-[13px] font-bold"
        style={{ color: 'var(--chalk)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {xp.toFixed(1)}
        <span className="text-[9px] opacity-70 ml-0.5">xP</span>
      </div>

      {open && (
        <div
          role="tooltip"
          className="absolute z-20"
          style={{
            bottom: 'calc(100% + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 230,
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '1.5px solid var(--ink)',
            padding: '10px 12px',
            boxShadow: '0 8px 22px rgba(0,0,0,0.55)',
          }}
        >
          <div
            className="flex justify-between items-baseline pb-1.5 mb-2"
            style={{ borderBottom: '1px solid var(--ink)' }}
          >
            <span className="font-serif font-extrabold text-base">{player.web_name}</span>
            <span
              className="font-mono text-[10px] tracking-wider"
              style={{ color: 'var(--ink-mute)' }}
            >
              {teams.find((t) => t.id === player.team)?.short_name ?? '—'} · {posLabel(player.element_type)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            <TipStat label="xP" value={xp.toFixed(1)} accent />
            <TipStat label="Form" value={formScore.toFixed(1)} />
            <TipStat label="£m" value={price.toFixed(1)} />
          </div>
          <p
            className="font-mono text-[9px] tracking-[0.14em] mb-1"
            style={{ color: 'var(--ink-mute)' }}
          >
            NEXT THREE
          </p>
          <div className="flex gap-1.5">
            {fx.length === 0 ? (
              <span className="font-mono text-[10px]" style={{ color: 'var(--ink-mute)' }}>
                Fixtures pending
              </span>
            ) : (
              fx.map((f, i) => {
                const c = diffStyle(f.diff);
                return (
                  <div
                    key={i}
                    className="flex-1 font-mono font-bold text-[11px] text-center"
                    style={{ background: c.fill, color: c.ink, padding: '6px 4px' }}
                  >
                    <div className="text-[9px] opacity-85">{f.home ? 'v' : '@'}</div>
                    <div>{f.opp}</div>
                  </div>
                );
              })
            )}
          </div>
          {/* arrow */}
          <span
            className="absolute"
            style={{
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--ink)',
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid var(--paper)',
            }}
          />
        </div>
      )}
    </div>
  );
}

function TipStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div
        className="font-mono text-[9px] tracking-[0.12em]"
        style={{ color: 'var(--ink-mute)' }}
      >
        {label}
      </div>
      <div
        className="font-serif font-extrabold text-lg leading-tight"
        style={{ color: accent ? 'var(--grass)' : 'var(--ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

export function posLabel(elementType: number): string {
  if (elementType === 1) return 'GK';
  if (elementType === 2) return 'DEF';
  if (elementType === 3) return 'MID';
  if (elementType === 4) return 'FWD';
  return '—';
}
