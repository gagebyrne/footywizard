import { describe, it, expect } from 'vitest';
import { statusIndicator } from '../../components/chalk-player';

describe('statusIndicator', () => {
  it('returns amber for doubtful player', () => {
    const result = statusIndicator('d');
    expect(result).toEqual({ color: '#C9A227' });
  });

  it('returns null for available player', () => {
    expect(statusIndicator('a')).toBeNull();
  });

  it('returns red for injured player', () => {
    expect(statusIndicator('i')).toEqual({ color: 'var(--red-rule)' });
  });

  it('returns red for unavailable player', () => {
    expect(statusIndicator('u')).toEqual({ color: 'var(--red-rule)' });
  });
});
