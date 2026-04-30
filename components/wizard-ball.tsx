import type { CSSProperties } from 'react';

interface WizardBallProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Football wearing a wizard hat. Monochrome (uses currentColor).
 * Set --ball-cut on a parent to control the punched-out paper colour.
 */
export function WizardBall({ size = 36, className, style }: WizardBallProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-label="FootyWizard"
      className={className}
      style={{ display: 'block', color: 'inherit', ...style }}
    >
      {/* football */}
      <g>
        <circle cx="32" cy="40" r="18" fill="currentColor" />
        <g
          fill="none"
          stroke="var(--ball-cut, #f2ebdd)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <polygon
            points="32,33 38.2,37.5 35.8,44.6 28.2,44.6 25.8,37.5"
            fill="var(--ball-cut, #f2ebdd)"
            stroke="none"
          />
          <line x1="32" y1="33" x2="32" y2="24" />
          <line x1="38.2" y1="37.5" x2="46" y2="35" />
          <line x1="35.8" y1="44.6" x2="41" y2="52" />
          <line x1="28.2" y1="44.6" x2="23" y2="52" />
          <line x1="25.8" y1="37.5" x2="18" y2="35" />
          <path d="M16 42 Q14 36 18 32" />
          <path d="M48 42 Q50 36 46 32" />
          <path d="M22 56 Q26 54 30 56" />
          <path d="M42 56 Q38 54 34 56" />
        </g>
      </g>
      {/* hat */}
      <g fill="currentColor">
        <path d="M32 4 C 33 4 33.4 5 33.6 6 L 44 26 C 44.4 27 43.7 27.8 42.7 27.4 C 38 25.6 34.6 24.8 32 24.8 C 29.4 24.8 26 25.6 21.3 27.4 C 20.3 27.8 19.6 27 20 26 L 30.4 6 C 30.6 5 31 4 32 4 Z" />
        <ellipse cx="32" cy="26" rx="16" ry="3.2" />
      </g>
      {/* hatband + tiny star */}
      <g fill="var(--ball-cut, #f2ebdd)">
        <rect x="22" y="24.4" width="20" height="2.4" rx="0.4" />
        <path d="M37 14 l0.7 1.7 1.8 0.2 -1.4 1.2 0.4 1.8 -1.5 -1 -1.5 1 0.4 -1.8 -1.4 -1.2 1.8 -0.2 z" />
      </g>
    </svg>
  );
}
