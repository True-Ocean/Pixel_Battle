import { describe, expect, it } from 'vitest';
import { normalizeSoundEnabled } from './preferences';

describe('normalizeSoundEnabled', () => {
  it('defaults to false when unset', () => {
    expect(normalizeSoundEnabled(undefined)).toBe(false);
    expect(normalizeSoundEnabled(null)).toBe(false);
  });

  it('returns true only when explicitly true', () => {
    expect(normalizeSoundEnabled(true)).toBe(true);
  });

  it('returns false when explicitly false', () => {
    expect(normalizeSoundEnabled(false)).toBe(false);
  });
});
