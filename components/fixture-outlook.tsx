'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { diffStyle, posLabel } from './chalk-player';

interface FixtureOutlookProps {
  players: Player[];
  fixtures: Fixture[];
  teams: Team[];
}

function getNextThreeFixtures(
  player: Player,
  fixtures: Fixture[],
  teams: Team[],
): Array<{ opponent: string; difficulty: number; isHome: boolean }> {
  const playerFixtures = fixtures
    .filter((f) => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
    .sort((a, b) => {
      if (a.event !== b.event) return (a.event || 999) - (b.event || 999);
      return new Date(a.kickoff_time || '').getTime() - new Date(b.kickoff_time || '').getTime();
    })
    .slice(0, 3);

  return playerFixtures.map((f) => {
    const isHome = f.team_h === player.team;
    const oppId = isHome ? f.team_a : f.team_h;
    const opponent = teams.find((t) => t.id === oppId)?.short_name ?? 'TBD';
    const difficulty = (isHome ? f.team_h_difficulty : f.team_a_difficulty) ?? 3;
    return { opponent, difficulty, isHome };
  });
}

type FixtureFlag = 'favorable' | 'unfavorable' | null;

function classifyFixtureRun(difficulties: number[]): FixtureFlag {
  if (difficulties.length < 3) return null;
  if (difficulties.filter((d) => d <= 2).length >= 3) return 'favorable';
  if (difficulties.filter((d) => d >= 4).length >= 3) return 'unfavorable';
  return null;
}

export function FixtureOutlook({ players, fixtures, teams }: FixtureOutlookProps) {
  const rows = players
    .map((player) => {
      const next = getNextThreeFixtures(player, fixtures, teams);
      const flag = classifyFixtureRun(next.map((f) => f.difficulty));
      return { player, fixtures: next, flag };
    })
    .sort((a, b) => {
      if (a.flag === 'favorable' && b.flag !== 'favorable') return -1;
      if (b.flag === 'favorable' && a.flag !== 'favorable') return 1;
      if (a.flag === 'unfavorable' && b.flag !== 'unfavorable') return -1;
      if (b.flag === 'unfavorable' && a.flag !== 'unfavorable') return 1;
      return 0;
    });

  const favorableCount = rows.filter((r) => r.flag === 'favorable').length;
  const unfavorableCount = rows.filter((r) => r.flag === 'unfavorable').length;
  console.log(
    `[FixtureOutlook] Analyzed ${players.length} players: ${favorableCount} favorable runs, ${unfavorableCount} unfavorable runs`,
  );

  const empty = fixtures.length === 0 || rows.every((r) => r.fixtures.length === 0);

  return (
    <div style={{ background: 'var(--paper-hi)', border: '2px solid var(--ink)' }}>
      <div
        className="px-4 py-2.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ borderBottom: '1px solid var(--ink)', color: 'var(--ink-mute)' }}
      >
        <span>Fixture outlook · next three</span>
        <span>{favorableCount} on the easy run</span>
      </div>

      {empty ? (
        <div
          className="px-4 py-8 text-center font-serif italic"
          style={{ color: 'var(--ink-mute)' }}
        >
          Fixtures not yet released for next gameweeks.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ink)' }}>
              {['Player', 'Team', 'Pos', 'GW+1', 'GW+2', 'GW+3', 'Run'].map((h, i) => (
                <th
                  key={h}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold"
                  style={{
                    color: 'var(--ink-mute)',
                    textAlign: i >= 3 && i <= 5 ? 'center' : 'left',
                    padding: '8px 12px',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, fixtures: next, flag }) => {
              const team = teams.find((t) => t.id === player.team);
              return (
                <tr key={player.id} style={{ borderBottom: '1px solid var(--paper-lo)' }}>
                  <td
                    className="font-serif font-extrabold text-base"
                    style={{ color: 'var(--ink)', padding: '8px 12px', letterSpacing: '-0.01em' }}
                  >
                    {player.web_name}
                  </td>
                  <td
                    className="font-mono text-xs"
                    style={{ color: 'var(--ink)', padding: '8px 12px' }}
                  >
                    {team?.short_name ?? '—'}
                  </td>
                  <td
                    className="font-mono text-[11px]"
                    style={{ color: 'var(--ink-mute)', padding: '8px 12px' }}
                  >
                    {posLabel(player.element_type)}
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const f = next[idx];
                    if (!f) {
                      return (
                        <td
                          key={idx}
                          style={{ padding: '8px 12px', textAlign: 'center' }}
                          className="font-mono text-xs"
                        >
                          —
                        </td>
                      );
                    }
                    const c = diffStyle(f.difficulty);
                    return (
                      <td key={idx} style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          className="inline-block font-mono text-[10px] font-bold tracking-wider"
                          style={{
                            background: c.fill,
                            color: c.ink,
                            padding: '3px 6px',
                            minWidth: 44,
                          }}
                        >
                          {f.isHome ? 'v' : '@'} {f.opponent}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 12px' }}>
                    {flag === 'favorable' && (
                      <span
                        className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style={{ background: 'var(--grass)', color: 'var(--captain-ink)' }}
                      >
                        Easy run
                      </span>
                    )}
                    {flag === 'unfavorable' && (
                      <span
                        className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style={{ background: 'var(--red-rule)', color: 'var(--captain-ink)' }}
                      >
                        Tough draw
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
