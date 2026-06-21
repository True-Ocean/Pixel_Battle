import { describe, expect, it } from 'vitest';
import { normalizeSoundEnabled } from './preferences';

describe('normalizeSoundEnabled', () => {
  it('defaults to true when unset', () => {
    expect(normalizeSoundEnabled(undefined)).toBe(true);
    expect(normalizeSoundEnabled(null)).toBe(true);
    expect(normalizeSoundEnabled(true)).toBe(true);
  });

  it('returns false only when explicitly false', () => {
    expect(normalizeSoundEnabled(false)).toBe(false);
  });
});
