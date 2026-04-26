'use client';

import type { Player } from '@/lib/types/fpl';
import { PlayerCard } from './player-card';

interface FormationPitchProps {
  lineup: Player[];
  captain: Player;
  formation: string;
  expectedPoints?: Map<number, number>;
}

// Formation structure definitions
const FORMATIONS: Record<string, { def: number; mid: number; fwd: number }> = {
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-5-1': { def: 4, mid: 5, fwd: 1 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
};

export function FormationPitch({ lineup, captain, formation, expectedPoints }: FormationPitchProps) {
  // Group players by position
  const gk = lineup.filter((p) => p.element_type === 1)[0];
  const defenders = lineup.filter((p) => p.element_type === 2);
  const midfielders = lineup.filter((p) => p.element_type === 3);
  const forwards = lineup.filter((p) => p.element_type === 4);

  // Get formation structure
  const formationStructure = FORMATIONS[formation] || { def: 4, mid: 4, fwd: 2 };

  // Helper to render a row of players
  const renderRow = (players: Player[], count: number) => {
    // Calculate centering offset for grid
    const maxCols = 5;
    const offset = Math.floor((maxCols - count) / 2);

    return (
      <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4">
        {players.slice(0, count).map((player) => {
          // Calculate expected points from player's form + fixture
          // For now, use a simple calculation based on form and points per game
          const formScore = parseFloat(player.form || '0');
          const ppg = parseFloat(player.points_per_game || '0');
          const calculatedExpectedPoints = (formScore * 0.6 + ppg * 0.4);

          return (
            <PlayerCard
              key={player.id}
              player={player}
              isCaptain={player.id === captain.id}
              expectedPoints={expectedPoints?.get(player.id) ?? calculatedExpectedPoints}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Football Pitch Background */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
        style={{
          aspectRatio: '3/4',
          background: 'linear-gradient(180deg, #1a4d2e 0%, #0f3a20 50%, #1a4d2e 100%)',
        }}
      >
        {/* Pitch Lines */}
        <div className="absolute inset-0 opacity-20">
          {/* Center Line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white" />
          {/* Center Circle */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ width: '15%', aspectRatio: '1' }}
          />
          {/* Penalty Boxes */}
          <div className="absolute left-1/4 right-1/4 top-0 h-[12%] border-2 border-white border-t-0" />
          <div className="absolute left-1/4 right-1/4 bottom-0 h-[12%] border-2 border-white border-b-0" />
          {/* Goal Areas */}
          <div className="absolute left-[35%] right-[35%] top-0 h-[6%] border-2 border-white border-t-0" />
          <div className="absolute left-[35%] right-[35%] bottom-0 h-[6%] border-2 border-white border-b-0" />
        </div>

        {/* Players Grid */}
        <div className="relative h-full flex flex-col justify-evenly items-center py-4 sm:py-6 md:py-8 px-2 sm:px-4">
          {/* Goalkeeper */}
          <div className="flex justify-center">
            {gk && (
              <PlayerCard
                player={gk}
                isCaptain={gk.id === captain.id}
                expectedPoints={
                  expectedPoints?.get(gk.id) ?? 
                  (parseFloat(gk.form || '0') * 0.6 + parseFloat(gk.points_per_game || '0') * 0.4)
                }
              />
            )}
          </div>

          {/* Defenders */}
          {renderRow(defenders, formationStructure.def)}

          {/* Midfielders */}
          {renderRow(midfielders, formationStructure.mid)}

          {/* Forwards */}
          {renderRow(forwards, formationStructure.fwd)}
        </div>
      </div>

      {/* Formation Label */}
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-slate-300 tracking-wide">
          Formation: <span className="text-white">{formation}</span>
        </p>
      </div>
    </div>
  );
}
