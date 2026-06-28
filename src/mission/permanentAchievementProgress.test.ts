import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { getActivePermanentAchievementMissions } from '../config/permanentAchievements';
import { createInitialMemoryAlbum } from '../user/memoryAlbum';
import { createInitialMissionState } from '../user/missionState';
import {
  reportPermanentDeckWinAchievements,
  syncPermanentOwnershipAchievements,
} from './permanentAchievementProgress';

const monday = new Date('2026-06-14T15:00:00.000Z');

function card(
  partial: Pick<Card, 'id' | 'attribute' | 'rarity'>,
): Card {
  return {
    id: partial.id,
    name: partial.id,
    pixels: [[null]],
    canvasSize: 1,
    attribute: partial.attribute,
    bp: 100,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: partial.rarity,
    stars: 0,
    createdAt: monday.toISOString(),
  };
}

describe('permanentAchievementProgress', () => {
  it('exposes attribute missions only when the attribute is unlocked', () => {
    expect(
      getActivePermanentAchievementMissions(1).some(
        (mission) => mission.id === 'permanent_own_attribute_power',
      ),
    ).toBe(false);
    expect(
      getActivePermanentAchievementMissions(6).some(
        (mission) => mission.id === 'permanent_own_attribute_power',
      ),
    ).toBe(true);
  });

  it('completes rarity ownership counter missions from deck and album state', () => {
    const state = createInitialMissionState(monday);
    const decks = [
      [
        card({ id: 'r1', attribute: 'attack', rarity: 'R' }),
        card({ id: 'r2', attribute: 'defense', rarity: 'R' }),
        null,
        null,
        null,
      ],
    ];
    const album = createInitialMemoryAlbum();
    album.cards.push(card({ id: 'sr1', attribute: 'defense', rarity: 'SR' }));

    const result = syncPermanentOwnershipAchievements(state, decks, album, 1, monday);

    expect(result.newlyCompleted.map((mission) => mission.id)).toEqual(
      expect.arrayContaining([
        'permanent_own_rarity_r_1',
        'permanent_own_rarity_r_2',
        'permanent_own_rarity_sr_1',
      ]),
    );
    expect(result.state.entries.permanent_own_rarity_r_2?.progress).toBe(2);
  });

  it('returns the same state when ownership sync is repeated without changes', () => {
    const state = createInitialMissionState(monday);
    const decks = [
      [
        card({ id: 'r1', attribute: 'attack', rarity: 'R' }),
        null,
        null,
        null,
        null,
      ],
    ];
    const album = createInitialMemoryAlbum();

    const first = syncPermanentOwnershipAchievements(state, decks, album, 1, monday);
    const second = syncPermanentOwnershipAchievements(
      first.state,
      decks,
      album,
      1,
      monday,
    );

    expect(second.state).toBe(first.state);
    expect(second.newlyCompleted).toEqual([]);
  });

  it('completes rarity deck win counter missions from battle deck composition', () => {
    const state = createInitialMissionState(monday);
    const deck = [
      card({ id: 'r1', attribute: 'attack', rarity: 'R' }),
      card({ id: 'r2', attribute: 'defense', rarity: 'R' }),
      card({ id: 'sr', attribute: 'ice', rarity: 'SR' }),
    ];

    const result = reportPermanentDeckWinAchievements(state, deck, 31, monday);

    expect(result.newlyCompleted.map((mission) => mission.id)).toEqual(
      expect.arrayContaining([
        'permanent_win_with_attribute_ice',
        'permanent_win_with_rarity_r_1',
        'permanent_win_with_rarity_r_2',
        'permanent_win_with_rarity_sr_1',
      ]),
    );
  });
});
