import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_META, getAttributeMeta } from './attributes';

describe('attributes', () => {
  it('maps attack to 剣', () => {
    expect(getAttributeMeta('attack')).toEqual(ATTRIBUTE_META.attack);
    expect(ATTRIBUTE_META.attack.label).toBe('剣');
  });

  it('maps defense to 盾', () => {
    expect(getAttributeMeta('defense')).toEqual(ATTRIBUTE_META.defense);
    expect(ATTRIBUTE_META.defense.label).toBe('盾');
  });
});
