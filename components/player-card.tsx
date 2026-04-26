'use client';

import type { Player } from '@/lib/types/fpl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Team ID to short name mapping (top 20 teams)
const TEAM_NAMES: Record<number, string> = {
  1: 'ARS', 2: 'AVL', 3: 'BOU', 4: 'BRE', 5: 'BHA',
  6: 'CHE', 7: 'CRY', 8: 'EVE', 9: 'FUL', 10: 'IPS',
  11: 'LEI', 12: 'LIV', 13: 'MCI', 14: 'MUN', 15: 'NEW',
  16: 'NFO', 17: 'SOU', 18: 'TOT', 19: 'WHU', 20: 'WOL',
};

interface PlayerCardProps {
  player: Player;
  isCaptain: boolean;
  expectedPoints: number;
}

export function PlayerCard({ player, isCaptain, expectedPoints }: PlayerCardProps) {
  const positionColors = {
    1: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300', // GK
    2: 'bg-blue-500/20 border-blue-500/40 text-blue-300', // DEF
    3: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', // MID
    4: 'bg-red-500/20 border-red-500/40 text-red-300', // FWD
  };

  const colorClass = positionColors[player.element_type as keyof typeof positionColors] || 
    'bg-slate-500/20 border-slate-500/40 text-slate-300';

  return (
    <Card
      className={cn(
        'relative w-20 sm:w-24 p-2 sm:p-3 backdrop-blur-md border-2 transition-all hover:scale-105 hover:shadow-2xl',
        colorClass,
        isCaptain && 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent'
      )}
    >
      {isCaptain && (
        <Badge
          className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-950 font-black text-xs px-1.5 py-0.5 shadow-lg"
        >
          C
        </Badge>
      )}
      
      <div className="text-center space-y-1">
        <p className="font-bold text-xs sm:text-sm leading-tight truncate">
          {player.web_name}
        </p>
        <p className="text-[10px] sm:text-xs opacity-80 font-medium">
          {TEAM_NAMES[player.team] || `T${player.team}`}
        </p>
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] opacity-70 gap-1">
          <span>£{(player.now_cost / 10).toFixed(1)}m</span>
          <span className="font-semibold">{expectedPoints.toFixed(1)}</span>
        </div>
      </div>
    </Card>
  );
}
