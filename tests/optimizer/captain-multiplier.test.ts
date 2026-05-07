import { describe, it, expect } from 'vitest';
import { captainMultiplier } from '../../lib/optimizer/ilp-solver';

describe('captainMultiplier', () => {
  it('returns 0.50 for GK (element_type 1)', () => {
    expect(captainMultiplier(1)).toBe(0.50);
  });

  it('returns 0.75 for DEF (element_type 2)', () => {
    expect(captainMultiplier(2)).toBe(0.75);
  });

  it('returns 1.10 for MID (element_type 3)', () => {
    expect(captainMultiplier(3)).toBe(1.10);
  });

  it('returns 1.20 for FWD (element_type 4)', () => {
    expect(captainMultiplier(4)).toBe(1.20);
  });
});
