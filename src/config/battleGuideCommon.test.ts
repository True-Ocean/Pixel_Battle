import { describe, expect, it } from 'vitest';
import { MELEE_ATTACK_GUIDE } from '../config/battleGuideCommon';

describe('MELEE_ATTACK_GUIDE', () => {
  it('近接攻撃の共通ルール4項目を含む', () => {
    expect(MELEE_ATTACK_GUIDE.label).toBe('近接攻撃');
    expect(MELEE_ATTACK_GUIDE.items).toHaveLength(4);
    expect(MELEE_ATTACK_GUIDE.items[0]).toContain('BP相当のダメージ');
    expect(MELEE_ATTACK_GUIDE.items[2]).toContain('50%');
  });
});
