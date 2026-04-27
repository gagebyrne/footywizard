'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FixtureOutlookProps {
  players: Player[];
  fixtures: Fixture[];
  teams: Team[];
}

// Helper to get difficulty color badge
function getDifficultyBadge(difficulty: number): string {
  if (difficulty <= 2) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (difficulty === 3) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

// Helper to get next 3 fixtures for a player
function getNextThreeFixtures(
  player: Player,
  fixtures: Fixture[],
  teams: Team[]
): Array<{ opponent: string; difficulty: number; isHome: boolean }> {
  const playerFixtures = fixtures
    .filter(f => {
      return (f.team_h === player.team || f.team_a === player.team) && !f.finished;
    })
    .sort((a, b) => {
      if (a.event !== b.event) return (a.event || 999) - (b.event || 999);
      return new Date(a.kickoff_time || '').getTime() - new Date(b.kickoff_time || '').getTime();
    })
    .slice(0, 3);

  return playerFixtures.map(f => {
    const isHome = f.team_h === player.team;
    const opponentId = isHome ? f.team_a : f.team_h;
    const opponent = teams.find(t => t.id === opponentId);
    
    return {
      opponent: opponent?.short_name || 'TBD',
      difficulty: isHome ? (f.team_h_difficulty || 3) : (f.team_a_difficulty || 3),
      isHome,
    };
  });
}

// Flag types
type FixtureFlag = 'favorable' | 'unfavorable' | null;

// Helper to determine if a run is favorable or unfavorable
function classifyFixtureRun(difficulties: number[]): FixtureFlag {
  if (difficulties.length < 3) return null;

  // Check for 3+ consecutive fixtures with difficulty ≤2 (favorable)
  const easyCount = difficulties.filter(d => d <= 2).length;
  if (easyCount >= 3) return 'favorable';

  // Check for 3+ consecutive fixtures with difficulty ≥4 (unfavorable)
  const hardCount = difficulties.filter(d => d >= 4).length;
  if (hardCount >= 3) return 'unfavorable';

  return null;
}

export function FixtureOutlook({ players, fixtures, teams }: FixtureOutlookProps) {
  const playersWithFixtures = players.map(player => {
    const nextThree = getNextThreeFixtures(player, fixtures, teams);
    const difficulties = nextThree.map(f => f.difficulty);
    const flag = classifyFixtureRun(difficulties);

    return {
      player,
      fixtures: nextThree,
      flag,
    };
  });

  // Sort: favorable first, then unfavorable, then neutral
  playersWithFixtures.sort((a, b) => {
    if (a.flag === 'favorable' && b.flag !== 'favorable') return -1;
    if (b.flag === 'favorable' && a.flag !== 'favorable') return 1;
    if (a.flag === 'unfavorable' && b.flag !== 'unfavorable') return -1;
    if (b.flag === 'unfavorable' && a.flag !== 'unfavorable') return 1;
    return 0;
  });

  // Count flagged players for observability
  const favorableCount = playersWithFixtures.filter(p => p.flag === 'favorable').length;
  const unfavorableCount = playersWithFixtures.filter(p => p.flag === 'unfavorable').length;

  console.log(
    `[FixtureOutlook] Analyzed ${players.length} players: ${favorableCount} favorable runs, ${unfavorableCount} unfavorable runs`
  );

  // Check if fixtures are available
  if (fixtures.length === 0 || playersWithFixtures.every(p => p.fixtures.length === 0)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 shadow-2xl">
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Fixture Outlook
          </h2>
          <p className="text-sm text-slate-400">
            Next 3 gameweeks difficulty analysis
          </p>
        </div>
        <div className="text-center py-8 text-slate-400">
          Fixtures not yet released for next gameweeks
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 shadow-2xl">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Fixture Outlook
        </h2>
        <p className="text-sm text-slate-400">
          Next 3 gameweeks difficulty analysis
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/5">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
              <TableHead className="text-slate-300 font-semibold">Player</TableHead>
              <TableHead className="text-slate-300 font-semibold">Team</TableHead>
              <TableHead className="text-slate-300 font-semibold text-center">GW+1</TableHead>
              <TableHead className="text-slate-300 font-semibold text-center">GW+2</TableHead>
              <TableHead className="text-slate-300 font-semibold text-center">GW+3</TableHead>
              <TableHead className="text-slate-300 font-semibold">Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playersWithFixtures.map(({ player, fixtures: playerFixtures, flag }) => {
              const team = teams.find(t => t.id === player.team);

              return (
                <TableRow
                  key={player.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <TableCell className="text-white font-medium">
                    {player.web_name}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {team?.short_name || 'N/A'}
                  </TableCell>

                  {/* Fixture cells */}
                  {[0, 1, 2].map(index => {
                    const fixture = playerFixtures[index];
                    if (!fixture) {
                      return (
                        <TableCell
                          key={index}
                          className="text-center text-slate-500 text-sm"
                        >
                          —
                        </TableCell>
                      );
                    }

                    const badgeClass = getDifficultyBadge(fixture.difficulty);

                    return (
                      <TableCell key={index} className="text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <span className="text-slate-300 text-sm font-medium">
                            {fixture.isHome ? 'v' : '@'} {fixture.opponent}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${badgeClass}`}
                          >
                            {fixture.difficulty}
                          </span>
                        </div>
                      </TableCell>
                    );
                  })}

                  {/* Flag column */}
                  <TableCell>
                    {flag === 'favorable' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-bold text-green-400">
                        <span>✓</span>
                        <span>Favorable</span>
                      </span>
                    )}
                    {flag === 'unfavorable' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400">
                        <span>⚠</span>
                        <span>Unfavorable</span>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
