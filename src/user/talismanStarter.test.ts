import { describe, expect, it } from 'vitest';
import { createInitialInventory } from './inventory';
import {
  crossedTalismanStarterLevel,
  isLossEnabledAtUserLevel,
  shouldGrantTalismanStarterOnDevSetLevel,
  tryGrantTalismanStarter,
} from './talismanStarter';

describe('isLossEnabledAtUserLevel', () => {
  it('disables loss below Lv5', () => {
    expect(isLossEnabledAtUserLevel(1)).toBe(false);
    expect(isLossEnabledAtUserLevel(4)).toBe(false);
  });

  it('enables loss at Lv5 and above', () => {
    expect(isLossEnabledAtUserLevel(5)).toBe(true);
    expect(isLossEnabledAtUserLevel(10)).toBe(true);
  });
});

describe('crossedTalismanStarterLevel', () => {
  it('detects first crossing of Lv5', () => {
    expect(crossedTalismanStarterLevel(4, 5)).toBe(true);
    expect(crossedTalismanStarterLevel(4, 7)).toBe(true);
  });

  it('does not trigger when already at or above Lv5', () => {
    expect(crossedTalismanStarterLevel(5, 6)).toBe(false);
    expect(crossedTalismanStarterLevel(6, 10)).toBe(false);
  });
});

describe('shouldGrantTalismanStarterOnDevSetLevel', () => {
  it('grants when setting to Lv5+ and not yet granted', () => {
    expect(shouldGrantTalismanStarterOnDevSetLevel(5, false)).toBe(true);
    expect(shouldGrantTalismanStarterOnDevSetLevel(10, false)).toBe(true);
  });

  it('skips when already granted or below Lv5', () => {
    expect(shouldGrantTalismanStarterOnDevSetLevel(10, true)).toBe(false);
    expect(shouldGrantTalismanStarterOnDevSetLevel(4, false)).toBe(false);
  });
});

describe('tryGrantTalismanStarter', () => {
  it('adds one talisman once', () => {
    const inventory = createInitialInventory();
    const first = tryGrantTalismanStarter(inventory, false);
    expect(first.granted).toBe(true);
    expect(first.inventory.talisman).toBe(1);
    expect(first.talismanStarterGranted).toBe(true);

    const second = tryGrantTalismanStarter(first.inventory, true);
    expect(second.granted).toBe(false);
    expect(second.inventory.talisman).toBe(1);
  });
});
