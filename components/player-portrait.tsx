'use client';

import { useState } from 'react';
import type { Player } from '@/lib/types/fpl';

interface PlayerPortraitProps {
  player: Pick<Player, 'web_name' | 'photo'>;
  size?: number;
  ringColor?: string | null;
  /** Hex/CSS background — usually the team primary colour. */
  background?: string | null;
}

function isLight(hex: string): boolean {
  const m = hex.match(/^#?([\da-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // perceived luminance
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

export function PlayerPortrait({
  player,
  size = 48,
  ringColor,
  background,
}: PlayerPortraitProps) {
  const [errored, setErrored] = useState(false);

  const photoBase = player.photo ? player.photo.replace(/\.jpg$/i, '').replace(/^p/, '') : null;
  const portraitUrl = photoBase
    ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoBase}.png`
    : null;

  const initials = player.web_name
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const bg = background ?? 'var(--paper-hi)';
  const initialsInk = background && isLight(background) ? '#16140F' : '#F2EBDD';

  return (
    <div
      className="grid place-items-center overflow-hidden relative shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        border: ringColor ? `2px solid ${ringColor}` : '1.5px solid var(--ink)',
      }}
    >
      {portraitUrl && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={portraitUrl}
          alt=""
          onError={() => setErrored(true)}
          style={{
            width: '108%',
            height: '108%',
            objectFit: 'cover',
            objectPosition: 'center 14%',
            display: 'block',
            filter: 'contrast(1.02)',
          }}
        />
      ) : (
        <span
          className="font-serif font-extrabold"
          style={{
            color: initialsInk,
            fontSize: size * 0.36,
            letterSpacing: '-0.02em',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
