import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_ROLL_RECENT_BOOST,
  getAttributeRollWeights,
  rollAttribute,
} from '../card/rollAttribute';
import { getLatestUnlockedAttribute } from '../config/attributeUnlock';

describe('rollAttribute', () => {
  it('Lv1は剣か盾のみ', () => {
    expect(rollAttribute(1, () => 0)).toBe('attack');
    expect(rollAttribute(1, () => 0.99)).toBe('defense');
  });

  it('Lv5以下では力は出ない', () => {
    for (let i = 0; i < 100; i++) {
      expect(rollAttribute(5, () => i / 100)).not.toBe('power');
    }
  });

  it('直近解放属性は他より10%权重が高い', () => {
    const weights = getAttributeRollWeights(6);
    const power = weights.find((entry) => entry.attribute === 'power');
    const attack = weights.find((entry) => entry.attribute === 'attack');
    expect(power?.weight).toBe(ATTRIBUTE_ROLL_RECENT_BOOST);
    expect(attack?.weight).toBe(1);
    expect(getLatestUnlockedAttribute(6)).toBe('power');
  });

  it('直近解放属性の出率は他属性より約10%高い', () => {
    const weights = getAttributeRollWeights(6);
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    const powerProb =
      weights.find((entry) => entry.attribute === 'power')!.weight / total;
    const attackProb =
      weights.find((entry) => entry.attribute === 'attack')!.weight / total;
    expect(powerProb / attackProb).toBeCloseTo(1.1, 5);
  });

  it('random=0で最初の候補', () => {
    const entries = getAttributeRollWeights(11);
    expect(rollAttribute(11, () => 0)).toBe(entries[0]!.attribute);
  });
});
