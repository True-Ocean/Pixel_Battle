import { describe, expect, it } from 'vitest';
import {
  addFreePixels,
  addJewels,
  createInitialEconomy,
  normalizeUserEconomy,
  setFreePixels,
  setJewels,
  spendFreePixels,
  spendJewels,
} from './economy';

describe('user economy', () => {
  it('creates empty economy', () => {
    expect(createInitialEconomy()).toEqual({ freePixels: 0, jewels: 0 });
  });

  it('normalizes invalid values', () => {
    expect(normalizeUserEconomy({ freePixels: 12.8 })).toEqual({
      freePixels: 12,
      jewels: 0,
    });
    expect(normalizeUserEconomy({ freePixels: 10, jewels: 5.9 })).toEqual({
      freePixels: 10,
      jewels: 5,
    });
    expect(normalizeUserEconomy(null)).toEqual({ freePixels: 0, jewels: 0 });
  });

  it('adds and spends jewels', () => {
    const economy = addJewels(createInitialEconomy(), 100);
    expect(economy).toEqual({ freePixels: 0, jewels: 100 });
    expect(spendJewels(economy, 30)).toEqual({ freePixels: 0, jewels: 70 });
    expect(spendJewels(economy, 101)).toBeNull();
  });

  it('adds and spends free pixels while preserving jewels', () => {
    const economy = addFreePixels(addJewels(createInitialEconomy(), 5), 2000);
    expect(economy).toEqual({ freePixels: 2000, jewels: 5 });
    expect(spendFreePixels(economy, 4000)).toBeNull();
    expect(spendFreePixels(economy, 2000)).toEqual({ freePixels: 0, jewels: 5 });
  });

  it('sets jewels to a non-negative integer', () => {
    expect(setJewels(createInitialEconomy(), 42)).toEqual({
      freePixels: 0,
      jewels: 42,
    });
    expect(setJewels(addJewels(createInitialEconomy(), 10), -3)).toEqual({
      freePixels: 0,
      jewels: 0,
    });
  });

  it('sets free pixels to a non-negative integer', () => {
    expect(setFreePixels(createInitialEconomy(), 4000)).toEqual({
      freePixels: 4000,
      jewels: 0,
    });
    expect(setFreePixels(addFreePixels(createInitialEconomy(), 100), -5)).toEqual({
      freePixels: 0,
      jewels: 0,
    });
  });
});
