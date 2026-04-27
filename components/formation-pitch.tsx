'use client';

import { useState } from 'react';
import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { PlayerCard } from './player-card';
import { cn } from '@/lib/utils';

interface FormationPitchProps {
  lineup: Player[];
  captain: Player;
  formation: string;
  expectedPoints?: Map<number, number>;
  fixtures: Fixture[];
  teams: Team[];
}

const FORMATIONS: Record<string, { def: number; mid: number; fwd: number }> = {
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-5-1': { def: 4, mid: 5, fwd: 1 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
};

export type DisplayMode = 'xp' | 'form';

export function FormationPitch({
  lineup,
  captain,
  formation,
  expectedPoints,
  fixtures,
  teams,
}: FormationPitchProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('xp');

  const gk = lineup.filter((p) => p.element_type === 1)[0];
  const defenders = lineup.filter((p) => p.element_type === 2);
  const midfielders = lineup.filter((p) => p.element_type === 3);
  const forwards = lineup.filter((p) => p.element_type === 4);

  const formationStructure = FORMATIONS[formation] || { def: 4, mid: 4, fwd: 2 };

  function calcXP(player: Player) {
    return parseFloat(player.form || '0') * 0.6 + parseFloat(player.points_per_game || '0') * 0.4;
  }

  const renderRow = (players: Player[], count: number) => (
    <div className="flex justify-center items-end gap-1.5 sm:gap-2 md:gap-3">
      {players.slice(0, count).map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isCaptain={player.id === captain.id}
          expectedPoints={expectedPoints?.get(player.id) ?? calcXP(player)}
          fixtures={fixtures}
          teams={teams}
          displayMode={displayMode}
        />
      ))}
    </div>
  );

  return (
    <div className="relative w-full mx-auto">
      {/* Display mode toggle */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex items-center rounded-full bg-black/30 backdrop-blur-sm border border-white/10 p-1 gap-1">
          <button
            onClick={() => setDisplayMode('xp')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-all',
              displayMode === 'xp'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-300 hover:text-white'
            )}
          >
            Expected Pts
          </button>
          <button
            onClick={() => setDisplayMode('form')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-all',
              displayMode === 'form'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-300 hover:text-white'
            )}
          >
            Form Score
          </button>
        </div>
      </div>

      {/* Football Pitch */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
        style={{
          aspectRatio: '3/4',
          background: 'linear-gradient(180deg, #1a4d2e 0%, #0f3a20 50%, #1a4d2e 100%)',
        }}
      >
        {/* Pitch Lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ width: '15%', aspectRatio: '1' }}
          />
          <div className="absolute left-1/4 right-1/4 top-0 h-[12%] border-2 border-white border-t-0" />
          <div className="absolute left-1/4 right-1/4 bottom-0 h-[12%] border-2 border-white border-b-0" />
          <div className="absolute left-[35%] right-[35%] top-0 h-[6%] border-2 border-white border-t-0" />
          <div className="absolute left-[35%] right-[35%] bottom-0 h-[6%] border-2 border-white border-b-0" />
        </div>

        {/* Players */}
        <div className="relative h-full flex flex-col justify-evenly items-center py-3 sm:py-5 px-2">
          <div className="flex justify-center">
            {gk && (
              <PlayerCard
                player={gk}
                isCaptain={gk.id === captain.id}
                expectedPoints={expectedPoints?.get(gk.id) ?? calcXP(gk)}
                fixtures={fixtures}
                teams={teams}
                displayMode={displayMode}
              />
            )}
          </div>
          {renderRow(defenders, formationStructure.def)}
          {renderRow(midfielders, formationStructure.mid)}
          {renderRow(forwards, formationStructure.fwd)}
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          Formation <span className="text-white ml-1">{formation}</span>
        </p>
      </div>
    </div>
  );
}
