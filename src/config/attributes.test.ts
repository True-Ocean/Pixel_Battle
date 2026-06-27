import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_META, getAttributeMeta } from './attributes';

describe('attributes', () => {
  it('maps attack to 剣', () => {
    expect(getAttributeMeta('attack')).toEqual(ATTRIBUTE_META.attack);
    expect(ATTRIBUTE_META.attack.label).toBe('剣');
    expect(ATTRIBUTE_META.attack.description).toBe('通常攻撃のみ（特殊能力なし）');
    expect(ATTRIBUTE_META.attack.battleGuide).toContain('近接攻撃');
  });

  it('maps defense to 盾', () => {
    expect(getAttributeMeta('defense')).toEqual(ATTRIBUTE_META.defense);
    expect(ATTRIBUTE_META.defense.label).toBe('盾');
    expect(ATTRIBUTE_META.defense.description).toContain('盾を持ち');
    expect(ATTRIBUTE_META.defense.battleGuide).toContain('盾付与');
    expect(ATTRIBUTE_META.defense.battleGuide).not.toContain('敵の攻撃を1回無効');
  });

  it('全属性に戦い方ガイドがある', () => {
    for (const meta of Object.values(ATTRIBUTE_META)) {
      expect(meta.battleGuide.trim().length).toBeGreaterThan(0);
    }
  });

  it('弓属性の説明とガイド', () => {
    expect(ATTRIBUTE_META.bow.description).toContain('弓攻撃');
    expect(ATTRIBUTE_META.bow.battleGuide).toContain('弓攻撃可能');
    expect(ATTRIBUTE_META.bow.battleGuide).not.toContain('反撃を受けない');
    expect(ATTRIBUTE_META.bow.battleGuide).not.toContain('2回まで');
  });
});
