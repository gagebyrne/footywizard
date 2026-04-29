'use client';

import { useState } from 'react';
import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { PlayerCard } from './player-card';
import { cn } from '@/lib/utils';

interface FormationPitchProps {
  lineup: Player[];
  captain: Player | null;
  formation: string;
  expectedPoints?: Map<number, number>;
  fixtures: Fixture[];
  teams: Team[];
  bench?: Player[];
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

function EmptySlot() {
  return (
    <div className="relative w-16 sm:w-20 rounded-xl overflow-hidden border-2 border-dashed border-white/25 bg-white/5 flex flex-col items-center justify-center text-center px-1 py-2 min-h-[5.5rem] sm:min-h-[6.5rem]">
      <svg viewBox="0 0 40 52" fill="currentColor" className="w-7 sm:w-9 opacity-20 text-white">
        <ellipse cx="20" cy="13" rx="9" ry="10" />
        <path d="M2 52 C2 34 10 26 20 26 C30 26 38 34 38 52 Z" />
      </svg>
      <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-widest mt-1">
        Empty
      </p>
    </div>
  );
}

export function FormationPitch({
  lineup,
  captain,
  formation,
  expectedPoints,
  fixtures,
  teams,
  bench,
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

  const renderRow = (players: Player[], count: number) => {
    const filled = players.slice(0, count);
    const emptyCount = Math.max(0, count - filled.length);
    return (
      <div className="flex justify-center items-end gap-1.5 sm:gap-2 md:gap-3">
        {filled.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isCaptain={captain != null && player.id === captain.id}
            expectedPoints={expectedPoints?.get(player.id) ?? calcXP(player)}
            fixtures={fixtures}
            teams={teams}
            displayMode={displayMode}
          />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
    );
  };

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
            {gk ? (
              <PlayerCard
                player={gk}
                isCaptain={captain != null && gk.id === captain.id}
                expectedPoints={expectedPoints?.get(gk.id) ?? calcXP(gk)}
                fixtures={fixtures}
                teams={teams}
                displayMode={displayMode}
              />
            ) : (
              <EmptySlot />
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

      {bench && bench.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-white/10 px-3 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center mb-3">
            Bench
          </p>
          <div className="flex justify-center gap-2 sm:gap-3">
            {bench.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isCaptain={false}
                expectedPoints={calcXP(player)}
                fixtures={fixtures}
                teams={teams}
                displayMode={displayMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
