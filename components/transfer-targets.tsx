'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { PlayerPortrait } from './player-portrait';
import { diffStyle, posLabel } from './chalk-player';
import { teamColor } from '@/lib/team-colors';

interface TransferTargetsProps {
  allPlayers: Player[];
  lineup: Player[];
  squadIds: number[];
  fixtures: Fixture[];
  teams: Team[];
}

function calculateExpectedPoints(player: Player): number {
  const formScore = parseFloat(player.form || '0');
  const ppg = parseFloat(player.points_per_game || '0');
  return formScore * 0.6 + ppg * 0.4;
}

function getNextFixture(
  player: Player,
  fixtures: Fixture[],
  teams: Team[],
): { opponent: string; difficulty: number; isHome: boolean } | null {
  const next = fixtures
    .filter((f) => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
    .sort((a, b) => {
      if (a.event !== b.event) return (a.event || 999) - (b.event || 999);
      return new Date(a.kickoff_time || '').getTime() - new Date(b.kickoff_time || '').getTime();
    })[0];

  if (!next) return null;
  const isHome = next.team_h === player.team;
  const oppId = isHome ? next.team_a : next.team_h;
  const difficulty = (isHome ? next.team_h_difficulty : next.team_a_difficulty) ?? 3;
  const opponent = teams.find((t) => t.id === oppId)?.short_name ?? 'TBD';
  return { opponent, difficulty, isHome };
}

export function TransferTargets({
  allPlayers,
  lineup: _lineup,
  squadIds,
  fixtures,
  teams,
}: TransferTargetsProps) {
  void _lineup;
  const squadIdSet = new Set(squadIds);
  const eligible = allPlayers.filter((p) => !squadIdSet.has(p.id) && p.status === 'a');

  const ranked = eligible
    .map((player) => ({ player, xP: calculateExpectedPoints(player) }))
    .sort((a, b) => b.xP - a.xP)
    .slice(0, 8);

  console.log(
    `[TransferTargets] Showing top 8 from ${eligible.length} eligible players (total players: ${allPlayers.length}, squad: ${squadIds.length})`,
  );

  return (
    <div
      className="p-5"
      style={{ background: 'var(--paper-hi)', border: '2px solid var(--ink)' }}
    >
      <p className="font-serif italic text-xs" style={{ color: 'var(--ink-mute)' }}>
        from the dugout
      </p>
      <h2
        className="font-serif font-extrabold text-[28px] tracking-[-0.025em] leading-none"
        style={{ color: 'var(--ink)' }}
      >
        Transfer targets
      </h2>
      <p
        className="font-sans italic text-[13px] mt-2 mb-3.5 leading-[1.5]"
        style={{ color: 'var(--ink-soft)' }}
      >
        The eight names worth your free transfer this week — ranked, no nonsense.
      </p>

      <div>
        {ranked.map(({ player, xP }, i) => {
          const team = teams.find((t) => t.id === player.team);
          const next = getNextFixture(player, fixtures, teams);
          const ownership = parseFloat(player.selected_by_percent || '0');
          const price = (player.now_cost ?? 0) / 10;
          const diffColors = next ? diffStyle(next.difficulty) : null;
          const portraitBg = teamColor(team?.short_name)?.primary ?? null;

          return (
            <div
              key={player.id}
              className="grid items-center gap-2.5 py-2.5"
              style={{
                gridTemplateColumns: '20px 38px 1fr auto auto',
                borderTop: i === 0 ? '1px solid var(--ink)' : '1px solid var(--paper-lo)',
              }}
            >
              <div
                className="font-serif italic font-extrabold text-[22px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                {i + 1}
              </div>
              <PlayerPortrait player={player} size={38} background={portraitBg} />
              <div className="min-w-0">
                <div
                  className="font-serif font-extrabold text-[18px] tracking-[-0.01em] leading-tight truncate"
                  style={{ color: 'var(--ink)' }}
                >
                  {player.web_name}
                </div>
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.12em] mt-0.5"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  {team?.short_name ?? '—'} · {posLabel(player.element_type)} · £
                  {price.toFixed(1)}m · {ownership.toFixed(1)}%
                </div>
              </div>
              {next && diffColors ? (
                <div
                  className="font-mono text-[10px] font-bold tracking-wider"
                  style={{
                    background: diffColors.fill,
                    color: diffColors.ink,
                    padding: '4px 8px',
                  }}
                >
                  {next.isHome ? 'v' : '@'} {next.opponent}
                </div>
              ) : (
                <span />
              )}
              <div
                className="font-serif font-extrabold text-[22px] tracking-[-0.02em] text-right min-w-[48px]"
                style={{ color: 'var(--grass)' }}
              >
                {xP.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
