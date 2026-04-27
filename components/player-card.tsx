'use client';

import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { cn } from '@/lib/utils';
import { PlayerTooltip } from './player-tooltip';
import { CaptainBadge } from './captain-badge';
import { StatusBadge } from './status-badge';
import type { DisplayMode } from './formation-pitch';

const TEAM_NAMES: Record<number, string> = {
  1: 'ARS', 2: 'AVL', 3: 'BOU', 4: 'BRE', 5: 'BHA',
  6: 'CHE', 7: 'CRY', 8: 'EVE', 9: 'FUL', 10: 'IPS',
  11: 'LEI', 12: 'LIV', 13: 'MCI', 14: 'MUN', 15: 'NEW',
  16: 'NFO', 17: 'SOU', 18: 'TOT', 19: 'WHU', 20: 'WOL',
};

const POSITION_COLORS = {
  1: { card: 'bg-yellow-500/20 border-yellow-500/50', value: 'text-yellow-300' },
  2: { card: 'bg-blue-500/20 border-blue-500/50', value: 'text-blue-300' },
  3: { card: 'bg-emerald-500/20 border-emerald-500/50', value: 'text-emerald-300' },
  4: { card: 'bg-red-500/20 border-red-500/50', value: 'text-red-300' },
} as const;

interface PlayerCardProps {
  player: Player;
  isCaptain: boolean;
  expectedPoints: number;
  fixtures: Fixture[];
  teams: Team[];
  displayMode?: DisplayMode;
}

export function PlayerCard({
  player,
  isCaptain,
  expectedPoints,
  fixtures,
  teams,
  displayMode = 'xp',
}: PlayerCardProps) {
  const colors = POSITION_COLORS[player.element_type as keyof typeof POSITION_COLORS]
    ?? { card: 'bg-slate-500/20 border-slate-500/50', value: 'text-slate-300' };

  const displayValue = displayMode === 'form'
    ? parseFloat(player.form || '0')
    : expectedPoints;
  const displayLabel = displayMode === 'form' ? 'Form' : 'xP';

  const photoBase = player.photo
    ? player.photo.replace(/\.jpg$/i, '').replace(/^p/, '')
    : null;
  const portraitUrl = photoBase
    ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoBase}.png`
    : null;

  return (
    <PlayerTooltip player={player} fixtures={fixtures} teams={teams}>
      <div
        className={cn(
          'relative w-16 sm:w-20 rounded-xl overflow-hidden backdrop-blur-md border-2 transition-all hover:scale-105 hover:shadow-2xl',
          colors.card,
          isCaptain && 'ring-4 ring-yellow-400 ring-offset-1 ring-offset-transparent'
        )}
      >
        <CaptainBadge isCaptain={isCaptain} />
        <StatusBadge status={player.status} />

        {/* Player portrait */}
        <div className="w-full h-12 sm:h-14 overflow-hidden bg-black/20">
          {portraitUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitUrl}
              alt=""
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Text info */}
        <div className="px-1 py-1 text-center space-y-0.5">
          <p className="font-bold text-[10px] sm:text-xs leading-tight truncate text-white">
            {player.web_name}
          </p>
          <p className="text-[9px] sm:text-[10px] text-white/60 font-medium">
            {TEAM_NAMES[player.team] || `T${player.team}`}
          </p>
          {/* Prominent metric */}
          <div className="pt-0.5">
            <p className={cn('text-sm sm:text-base font-black leading-none', colors.value)}>
              {displayValue.toFixed(1)}
            </p>
            <p className="text-[7px] sm:text-[8px] text-white/40 uppercase tracking-wider mt-0.5">
              {displayLabel}
            </p>
          </div>
        </div>
      </div>
    </PlayerTooltip>
  );
}
