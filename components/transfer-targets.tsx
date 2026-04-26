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

interface TransferTargetsProps {
  allPlayers: Player[];
  lineup: Player[];
  fixtures: Fixture[];
  teams: Team[];
}

// Helper to calculate expected points for a player
function calculateExpectedPoints(player: Player): number {
  const formScore = parseFloat(player.form || '0');
  const ppg = parseFloat(player.points_per_game || '0');
  return formScore * 0.6 + ppg * 0.4;
}

// Helper to get difficulty icon
function getDifficultyIcon(difficulty: number): string {
  if (difficulty <= 2) return '🟢';
  if (difficulty === 3) return '🟡';
  return '🔴';
}

// Helper to get next fixture for a player
function getNextFixture(
  player: Player,
  fixtures: Fixture[],
  teams: Team[]
): { opponent: string; difficulty: number } | null {
  // Find the next upcoming fixture for this player's team
  const nextFixture = fixtures
    .filter(f => {
      return (f.team_h === player.team || f.team_a === player.team) && !f.finished;
    })
    .sort((a, b) => {
      // Sort by event (gameweek) then kickoff time
      if (a.event !== b.event) return (a.event || 999) - (b.event || 999);
      return new Date(a.kickoff_time || '').getTime() - new Date(b.kickoff_time || '').getTime();
    })[0];

  if (!nextFixture) return null;

  const isHome = nextFixture.team_h === player.team;
  const opponentId = isHome ? nextFixture.team_a : nextFixture.team_h;
  const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;

  const opponent = teams.find(t => t.id === opponentId);
  return {
    opponent: opponent?.short_name || 'TBD',
    difficulty: difficulty || 3,
  };
}

export function TransferTargets({
  allPlayers,
  lineup,
  fixtures,
  teams,
}: TransferTargetsProps) {
  // Filter out players in lineup
  const lineupIds = new Set(lineup.map(p => p.id));
  const eligiblePlayers = allPlayers.filter(p => !lineupIds.has(p.id));

  // Calculate expected points for each player
  const playersWithExpectedPoints = eligiblePlayers.map(player => ({
    player,
    expectedPoints: calculateExpectedPoints(player),
  }));

  // Sort by expected points descending
  playersWithExpectedPoints.sort((a, b) => b.expectedPoints - a.expectedPoints);

  // Take top 15
  const topTargets = playersWithExpectedPoints.slice(0, 15);

  console.log(
    `[TransferTargets] Showing top 15 from ${eligiblePlayers.length} eligible players (total players: ${allPlayers.length}, lineup: ${lineup.length})`
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 shadow-2xl">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Transfer Targets
        </h2>
        <p className="text-sm text-slate-400">
          Top 15 players not in your optimal squad
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/5">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
              <TableHead className="text-slate-300 font-semibold w-12">#</TableHead>
              <TableHead className="text-slate-300 font-semibold">Name</TableHead>
              <TableHead className="text-slate-300 font-semibold">Team</TableHead>
              <TableHead className="text-slate-300 font-semibold">Pos</TableHead>
              <TableHead className="text-slate-300 font-semibold text-right">xP</TableHead>
              <TableHead className="text-slate-300 font-semibold text-right">£</TableHead>
              <TableHead className="text-slate-300 font-semibold text-right">Form</TableHead>
              <TableHead className="text-slate-300 font-semibold">Next</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topTargets.map((target, index) => {
              const { player, expectedPoints } = target;
              const team = teams.find(t => t.id === player.team);
              const nextFixture = getNextFixture(player, fixtures, teams);
              
              // Position display
              const positionMap: Record<number, string> = {
                1: 'GK',
                2: 'DEF',
                3: 'MID',
                4: 'FWD',
              };
              const position = positionMap[player.element_type] || 'N/A';

              return (
                <TableRow
                  key={player.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <TableCell className="text-slate-400 font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {player.web_name}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {team?.short_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm font-mono">
                    {position}
                  </TableCell>
                  <TableCell className="text-emerald-400 font-bold text-right tabular-nums">
                    {expectedPoints.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-amber-400 font-semibold text-right tabular-nums">
                    {(player.now_cost / 10).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-slate-300 text-right tabular-nums">
                    {parseFloat(player.form || '0').toFixed(1)}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {nextFixture ? (
                      <span className="inline-flex items-center gap-1">
                        <span>{getDifficultyIcon(nextFixture.difficulty)}</span>
                        <span>{nextFixture.opponent}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
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
