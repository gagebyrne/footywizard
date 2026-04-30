'use client';

import { useState } from 'react';
import type { Player } from '@/lib/types/fpl';

interface PlayerPortraitProps {
  player: Pick<Player, 'web_name' | 'photo'>;
  size?: number;
  ringColor?: string | null;
  background?: string;
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

  return (
    <div
      className="grid place-items-center overflow-hidden relative shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: background ?? 'var(--paper-hi)',
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
            color: 'var(--paper)',
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
