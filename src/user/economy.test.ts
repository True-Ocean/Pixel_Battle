import { describe, expect, it } from 'vitest';
import {
  addFreePixels,
  createInitialEconomy,
  normalizeUserEconomy,
  spendFreePixels,
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

  it('spends free pixels when balance is sufficient', () => {
    const economy = addFreePixels(createInitialEconomy(), 4000);
    expect(spendFreePixels(economy, 4000)).toEqual({ freePixels: 0 });
  });

  it('returns null when spending more than balance', () => {
    expect(spendFreePixels(createInitialEconomy(), 1)).toBeNull();
  });
});
