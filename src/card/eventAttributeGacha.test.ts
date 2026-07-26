import { describe, expect, it } from 'vitest';
import {
  getEventGachaFeaturedAttribute,
  isEventAttributeGachaAvailable,
  rollEventAttributeGacha,
  syncAttributeEventGachaState,
} from './eventAttributeGacha';

describe('eventAttributeGacha', () => {
  it('is unavailable below Lv21', () => {
    expect(isEventAttributeGachaAvailable(20)).toBe(false);
    expect(getEventGachaFeaturedAttribute(20)).toBeNull();
  });

  it('features poison from Lv21 until heal unlock', () => {
    expect(getEventGachaFeaturedAttribute(21)).toBe('poison');
    expect(getEventGachaFeaturedAttribute(25)).toBe('poison');
    expect(getEventGachaFeaturedAttribute(26)).toBe('heal');
  });

  it('keeps illuminate available with no next unlock', () => {
    expect(getEventGachaFeaturedAttribute(46)).toBe('illuminate');
    expect(isEventAttributeGachaAvailable(50)).toBe(true);
  });

  it('resets pity when featured attribute changes', () => {
    const synced = syncAttributeEventGachaState(
      { featuredAttribute: 'poison', pityMissCount: 7 },
      26,
    );
    expect(synced).toEqual({ featuredAttribute: 'heal', pityMissCount: 0 });
  });

  it('forces featured attribute on pity', () => {
    const result = rollEventAttributeGacha(21, 9, () => 0.99);
    expect(result.attribute).toBe('poison');
    expect(result.nextPityMissCount).toBe(0);
  });

  it('rolls featured at 20% threshold', () => {
    expect(rollEventAttributeGacha(21, 0, () => 0.19).attribute).toBe('poison');
    const miss = rollEventAttributeGacha(21, 0, () => 0.2);
    expect(miss.attribute).not.toBe('poison');
    expect(miss.nextPityMissCount).toBe(1);
  });
});
