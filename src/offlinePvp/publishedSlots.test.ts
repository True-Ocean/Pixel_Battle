import { describe, expect, it } from 'vitest';
import {
  clearLocalPublishedDeckState,
  clearPublishedDeckRemoteIds,
  normalizePublishedDeckRemoteIds,
  normalizePublishedDeckSlots,
  setPublishedRemoteId,
  setPublishedSlot,
} from './publishedSlots';

describe('publishedSlots', () => {
  it('normalizes missing published flags to false', () => {
    expect(normalizePublishedDeckSlots(undefined)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('sets a slot published flag', () => {
    const next = setPublishedSlot([false, false, false, false, false], 2, true);
    expect(next[2]).toBe(true);
    expect(next[0]).toBe(false);
  });

  it('stores remote ids per slot', () => {
    const next = setPublishedRemoteId(
      [null, null, null, null, null],
      1,
      'uuid-1',
    );
    expect(normalizePublishedDeckRemoteIds(next)[1]).toBe('uuid-1');
  });

  it('clears remote ids while keeping slot count', () => {
    expect(clearPublishedDeckRemoteIds()).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('clears local publish flags and remote ids', () => {
    expect(clearLocalPublishedDeckState()).toEqual({
      slots: normalizePublishedDeckSlots(undefined),
      remoteIds: clearPublishedDeckRemoteIds(),
    });
  });
});
