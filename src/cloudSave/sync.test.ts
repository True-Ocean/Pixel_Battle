import { describe, expect, it } from 'vitest';
import type { SaveData } from '../types';
import {
  hasPlayableProgress,
  pickSyncDirection,
  resolveSyncDirection,
} from './sync';

function emptySave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    decks: [[null, null, null, null, null]],
    activeDeckIndex: 0,
    lastBattleDeckIndex: 0,
    unlockedDeckCount: 1,
    user: null,
    ...overrides,
  };
}

describe('pickSyncDirection', () => {
  it('uploads when cloud is empty', () => {
    expect(pickSyncDirection('2026-07-04T10:00:00.000Z', null)).toBe('upload');
  });

  it('downloads when cloud is newer', () => {
    expect(
      pickSyncDirection('2026-07-04T10:00:00.000Z', '2026-07-04T12:00:00.000Z'),
    ).toBe('download');
  });

  it('uploads when local is newer', () => {
    expect(
      pickSyncDirection('2026-07-04T12:00:00.000Z', '2026-07-04T10:00:00.000Z'),
    ).toBe('upload');
  });

  it('noops when timestamps match', () => {
    expect(
      pickSyncDirection('2026-07-04T10:00:00.000Z', '2026-07-04T10:00:00.000Z'),
    ).toBe('noop');
  });
});

describe('hasPlayableProgress', () => {
  it('is false for empty save', () => {
    expect(hasPlayableProgress(emptySave())).toBe(false);
  });

  it('is true when deck has cards', () => {
    expect(
      hasPlayableProgress(
        emptySave({
          decks: [
            [
              {
                id: 'c1',
                name: 'a',
                pixels: [],
                canvasSize: 16,
                attribute: 'attack',
                bp: 10,
                wins: 0,
                losses: 0,
                reviveCount: 0,
                rarity: 'N',
                stars: 0,
                createdAt: '',
              },
              null,
              null,
              null,
              null,
            ],
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('resolveSyncDirection', () => {
  it('uploads local progress when cloud has no progress even if cloud timestamp is newer', () => {
    expect(
      resolveSyncDirection({
        localAt: '2026-07-04T10:00:00.000Z',
        cloudAt: '2026-07-04T12:00:00.000Z',
        localHasProgress: true,
        cloudHasProgress: false,
      }),
    ).toBe('upload');
  });

  it('uploads when cloud row is missing', () => {
    expect(
      resolveSyncDirection({
        localAt: '2026-07-04T10:00:00.000Z',
        cloudAt: null,
        localHasProgress: true,
        cloudHasProgress: false,
      }),
    ).toBe('upload');
  });

  it('downloads when only cloud has progress', () => {
    expect(
      resolveSyncDirection({
        localAt: '2026-07-04T12:00:00.000Z',
        cloudAt: '2026-07-04T10:00:00.000Z',
        localHasProgress: false,
        cloudHasProgress: true,
      }),
    ).toBe('download');
  });
});
