'use client';

import { useState } from 'react';
import type { Player, Fixture, Team } from '@/lib/types/fpl';
import { ChalkPlayer } from './chalk-player';
import { ChalkBenchRow } from './chalk-bench';

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

function calcXP(player: Player) {
  return parseFloat(player.form || '0') * 0.6 + parseFloat(player.points_per_game || '0') * 0.4;
}

function EmptySlot() {
  return (
    <div
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full"
      style={{
        border: '2px dashed rgba(242,235,221,0.5)',
        background: 'rgba(0,0,0,0.18)',
      }}
      aria-label="Empty slot"
    />
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
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const gk = lineup.filter((p) => p.element_type === 1)[0];
  const defenders = lineup.filter((p) => p.element_type === 2);
  const midfielders = lineup.filter((p) => p.element_type === 3);
  const forwards = lineup.filter((p) => p.element_type === 4);

  const formationStructure = FORMATIONS[formation] || { def: 4, mid: 4, fwd: 2 };

  const renderRow = (players: Player[], count: number) => {
    const filled = players.slice(0, count);
    const empties = Math.max(0, count - filled.length);
    return (
      <div className="flex justify-evenly items-center gap-2 px-2">
        {filled.map((p) => (
          <ChalkPlayer
            key={p.id}
            player={p}
            isCaptain={captain != null && p.id === captain.id}
            xp={expectedPoints?.get(p.id) ?? calcXP(p)}
            fixtures={fixtures}
            teams={teams}
            hovered={hoveredId === p.id}
            onHover={setHoveredId}
          />
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {/* Chalk pitch */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: '3/4',
          background:
            'radial-gradient(ellipse at center top, #3F8A4D 0%, #2F6E3B 50%, #1A3F22 100%)',
          border: '2px solid var(--ink)',
        }}
      >
        {/* Faint vertical mowing pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 6px)',
          }}
        />

        {/* Chalk lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.55 }}
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="chalk-fx">
              <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="1.5" />
            </filter>
          </defs>
          <g stroke="#F2EBDD" strokeWidth="1.5" fill="none" filter="url(#chalk-fx)">
            <rect x="6" y="6" width="288" height="388" />
            <line x1="6" y1="200" x2="294" y2="200" />
            <circle cx="150" cy="200" r="40" />
            <circle cx="150" cy="200" r="2" fill="#F2EBDD" />
            <rect x="60" y="6" width="180" height="60" />
            <rect x="105" y="6" width="90" height="22" />
            <rect x="60" y="334" width="180" height="60" />
            <rect x="105" y="372" width="90" height="22" />
            <path d="M 110 66 Q 150 96 190 66" />
            <path d="M 110 334 Q 150 304 190 334" />
          </g>
        </svg>

        {/* Pitch label corners */}
        <div
          className="absolute top-3 left-4 font-serif italic text-sm tracking-wide"
          style={{ color: 'rgba(242,235,221,0.5)' }}
        >
          the form book · {formation}
        </div>
        <div
          className="absolute bottom-3 right-4 font-mono text-[10px] tracking-[0.18em]"
          style={{ color: 'rgba(242,235,221,0.5)' }}
        >
          XI · {formation}
        </div>

        {/* Players */}
        <div className="relative h-full flex flex-col justify-evenly py-6 sm:py-8">
          {/* FWD on top of pitch (mirror of design) */}
          {renderRow(forwards, formationStructure.fwd)}
          {renderRow(midfielders, formationStructure.mid)}
          {renderRow(defenders, formationStructure.def)}
          <div className="flex justify-center">
            {gk ? (
              <ChalkPlayer
                player={gk}
                isCaptain={captain != null && gk.id === captain.id}
                xp={expectedPoints?.get(gk.id) ?? calcXP(gk)}
                fixtures={fixtures}
                teams={teams}
                hovered={hoveredId === gk.id}
                onHover={setHoveredId}
              />
            ) : (
              <EmptySlot />
            )}
          </div>
        </div>
      </div>

      {/* Bench */}
      {bench && bench.length > 0 && (
        <ChalkBenchRow bench={bench} fixtures={fixtures} teams={teams} />
      )}
    </div>
  );
}
