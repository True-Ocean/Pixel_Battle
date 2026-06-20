import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_UNLOCK_SCHEDULE,
  getAttributeUnlockLevel,
  getLatestUnlockedAttribute,
  getUnlockedAttributes,
  isAttributeUnlockedAtLevel,
} from './attributeUnlock';

describe('attributeUnlock', () => {
  it('Lv1は剣・盾のみ', () => {
    expect(getUnlockedAttributes(1)).toEqual(['attack', 'defense']);
  });

  it('Lv6で力が解放される', () => {
    expect(getUnlockedAttributes(5)).toEqual(['attack', 'defense']);
    expect(getUnlockedAttributes(6)).toEqual(['attack', 'defense', 'power']);
    expect(isAttributeUnlockedAtLevel('power', 6)).toBe(true);
    expect(isAttributeUnlockedAtLevel('power', 5)).toBe(false);
  });

  it('解放レベルを返す', () => {
    expect(getAttributeUnlockLevel('attack')).toBe(1);
    expect(getAttributeUnlockLevel('power')).toBe(6);
    expect(getAttributeUnlockLevel('bow')).toBe(11);
  });

  it('スケジュールはLv昇順', () => {
    const levels = ATTRIBUTE_UNLOCK_SCHEDULE.map((entry) => entry.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('直近解放属性を返す', () => {
    expect(getLatestUnlockedAttribute(5)).toBeNull();
    expect(getLatestUnlockedAttribute(6)).toBe('power');
    expect(getLatestUnlockedAttribute(31)).toBe('ice');
  });
});
