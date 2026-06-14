import { describe, expect, it } from 'vitest';
import {
  addFreePixels,
  createInitialEconomy,
  normalizeUserEconomy,
} from './economy';

describe('user economy', () => {
  it('creates empty economy', () => {
    expect(createInitialEconomy()).toEqual({ freePixels: 0 });
  });

  it('normalizes invalid values', () => {
    expect(normalizeUserEconomy({ freePixels: 12.8 })).toEqual({
      freePixels: 12,
    });
    expect(normalizeUserEconomy(null)).toEqual({ freePixels: 0 });
  });

  it('adds free pixels', () => {
    expect(addFreePixels(createInitialEconomy(), 2000)).toEqual({
      freePixels: 2000,
    });
  });
});
