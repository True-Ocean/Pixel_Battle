import { describe, expect, it } from 'vitest';
import {
  hydrateSaveFromParsed,
  serializeSaveForStorage,
  SAVE_SCHEMA_VERSION,
} from '../storage';
import { fetchPlayerSave, upsertPlayerSave } from './playerSave';

describe('hydrateSaveFromParsed / serializeSaveForStorage (cloudSave 用)', () => {
  it('round-trips a minimal save through serialize and hydrate', () => {
    const serialized = serializeSaveForStorage({
      schemaVersion: SAVE_SCHEMA_VERSION,
      user: {
        username: 'tester',
        level: 3,
        exp: 10,
        battleWins: 1,
        battleLosses: 0,
        cpuBattleWins: 1,
        cpuBattleLosses: 0,
        offlinePvpBattleWins: 0,
        offlinePvpBattleLosses: 0,
      },
      decks: [[null, null, null, null, null]],
      activeDeckIndex: 0,
      lastBattleDeckIndex: 0,
      unlockedDeckCount: 1,
    });

    const hydrated = hydrateSaveFromParsed(serialized);
    expect(hydrated).not.toBeNull();
    expect(hydrated!.save.user?.username).toBe('tester');
    expect(hydrated!.save.user?.level).toBe(3);
    expect(hydrated!.save.decks).toHaveLength(5);
  });

  it('returns null when decks are missing', () => {
    expect(hydrateSaveFromParsed({ user: null })).toBeNull();
  });
});

describe('fetchPlayerSave / upsertPlayerSave', () => {
  it('returns not_configured or not_authenticated without a live session', async () => {
    const fetched = await fetchPlayerSave();
    expect(fetched.ok).toBe(false);
    if (!fetched.ok) {
      expect(['not_configured', 'not_authenticated']).toContain(fetched.reason);
    }

    const upserted = await upsertPlayerSave(
      {
        schemaVersion: SAVE_SCHEMA_VERSION,
        user: null,
        decks: [[null, null, null, null, null]],
        activeDeckIndex: 0,
        lastBattleDeckIndex: 0,
        unlockedDeckCount: 1,
      },
      new Date().toISOString(),
    );
    expect(upserted.ok).toBe(false);
    if (!upserted.ok) {
      expect(['not_configured', 'not_authenticated']).toContain(upserted.reason);
    }
  });
});
