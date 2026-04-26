'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PlayerTooltipProps {
  player: Player;
  fixtures: Fixture[];
  teams: Team[];
  children: React.ReactNode;
}

/**
 * Calculate fixture score (0-5) from difficulty rating
 * Lower difficulty = higher score for the player's team
 */
function calculateFixtureScore(difficulty: number): number {
  return Math.max(0, 5 - difficulty);
}

/**
 * Get difficulty color classes based on rating
 */
function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 2) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (difficulty === 3) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  return 'bg-red-500/20 text-red-300 border-red-500/40';
}

export function PlayerTooltip({
  player,
  fixtures,
  teams,
  children,
}: PlayerTooltipProps) {
  // Find next 3 fixtures for this player's team
  const playerFixtures = fixtures
    .filter(
      (f) =>
        (f.team_h === player.team || f.team_a === player.team) &&
        !f.finished &&
        f.event !== null
    )
    .sort((a, b) => {
      if (!a.kickoff_time || !b.kickoff_time) return 0;
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    })
    .slice(0, 3);

  const hasFixtures = playerFixtures.length > 0;

  // Calculate fixture score (average of next 3 fixture difficulties)
  const fixtureScore = hasFixtures
    ? playerFixtures.reduce((sum, f) => {
        const difficulty =
          f.team_h === player.team ? f.team_h_difficulty : f.team_a_difficulty;
        return sum + calculateFixtureScore(difficulty || 3);
      }, 0) / playerFixtures.length
    : 0;

  const formScore = parseFloat(player.form || '0');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`View details for ${player.web_name}`}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-4 space-y-3 backdrop-blur-xl bg-slate-900/95 border-slate-700"
        side="top"
        align="center"
      >
        {/* Player Name & Team */}
        <div className="border-b border-slate-700 pb-2">
          <h3 className="font-bold text-sm text-white">{player.web_name}</h3>
          <p className="text-xs text-slate-400">
            {teams.find((t) => t.id === player.team)?.name || `Team ${player.team}`}
          </p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-emerald-400 font-medium">Fixture Score</p>
            <p className="text-lg font-black text-emerald-300">
              {hasFixtures ? fixtureScore.toFixed(1) : 'N/A'}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-400 font-medium">Form Score</p>
            <p className="text-lg font-black text-blue-300">{formScore.toFixed(1)}</p>
          </div>
        </div>

        {/* Upcoming Fixtures */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Next 3 Fixtures</h4>
          {!hasFixtures ? (
            <p className="text-xs text-slate-400 italic">
              Fixtures not yet released for this gameweek
            </p>
          ) : (
            <div className="space-y-1.5">
              {playerFixtures.map((fixture) => {
                const isHome = fixture.team_h === player.team;
                const opponentId = isHome ? fixture.team_a : fixture.team_h;
                const opponent = teams.find((t) => t.id === opponentId);
                const difficulty = isHome
                  ? fixture.team_h_difficulty
                  : fixture.team_a_difficulty;

                return (
                  <div
                    key={fixture.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded border text-xs',
                      getDifficultyColor(difficulty || 3)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isHome ? 'vs' : '@'} {opponent?.short_name || `T${opponentId}`}
                      </span>
                      <span className="text-[10px] opacity-70">
                        (GW{fixture.event})
                      </span>
                    </div>
                    <span className="font-bold">{difficulty}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700 text-center text-xs">
          <div>
            <p className="text-slate-400">PPG</p>
            <p className="font-semibold text-white">
              {parseFloat(player.points_per_game || '0').toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Total Pts</p>
            <p className="font-semibold text-white">{player.total_points}</p>
          </div>
          <div>
            <p className="text-slate-400">Selected</p>
            <p className="font-semibold text-white">
              {parseFloat(player.selected_by_percent || '0').toFixed(1)}%
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
