import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../types';
import {
  getPublicProfileByOwnerId,
  publicProfileUpsertRow,
  rowToPublicProfile,
  saveCurrentPublicProfile,
} from './repository';

const mocks = vi.hoisted(() => {
  const upsert = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ upsert, select }));
  return {
    ensureAnonymousUserId: vi.fn(),
    isSupabaseConfigured: vi.fn(),
    getSupabaseClient: vi.fn(() => ({ from })),
    from,
    upsert,
    select,
    eq,
    maybeSingle,
  };
});

vi.mock('../auth', () => ({
  ensureAnonymousUserId: mocks.ensureAnonymousUserId,
}));

vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
  getSupabaseClient: mocks.getSupabaseClient,
}));

function makeUser(): UserProfile {
  return {
    username: ' テスト ',
    profileComment: ' よろしく！ ',
    level: 12,
    exp: 999,
    battleWins: 6,
    battleLosses: 9,
    cpuBattleWins: 1,
    cpuBattleLosses: 2,
    offlinePvpBattleWins: 2,
    offlinePvpBattleLosses: 3,
    onlinePvpBattleWins: 3,
    onlinePvpBattleLosses: 4,
  };
}

function makeRow() {
  return {
    owner_id: 'owner-a',
    username: 'テスト',
    profile_comment: 'よろしく！',
    avatar: null,
    level: 12,
    cpu_battle_wins: 1,
    cpu_battle_losses: 2,
    offline_pvp_battle_wins: 3,
    offline_pvp_battle_losses: 4,
    online_pvp_battle_wins: 5,
    online_pvp_battle_losses: 6,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T01:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.ensureAnonymousUserId.mockResolvedValue('owner-a');
  mocks.getSupabaseClient.mockReturnValue({ from: mocks.from });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: makeRow(), error: null });
});

describe('publicProfileUpsertRow', () => {
  it('maps only public profile fields to the server row', () => {
    const row = publicProfileUpsertRow(
      'owner-a',
      makeUser(),
      new Date('2026-07-18T02:00:00.000Z'),
    );
    expect(row).toEqual({
      owner_id: 'owner-a',
      username: 'テスト',
      profile_comment: 'よろしく！',
      avatar: null,
      level: 12,
      cpu_battle_wins: 1,
      cpu_battle_losses: 2,
      offline_pvp_battle_wins: 2,
      offline_pvp_battle_losses: 3,
      online_pvp_battle_wins: 3,
      online_pvp_battle_losses: 4,
      updated_at: '2026-07-18T02:00:00.000Z',
    });
    expect(row).not.toHaveProperty('exp');
    expect(row).not.toHaveProperty('battleWins');
  });
});

describe('rowToPublicProfile', () => {
  it('normalizes a valid row', () => {
    expect(rowToPublicProfile(makeRow())).toEqual({
      ownerId: 'owner-a',
      username: 'テスト',
      profileComment: 'よろしく！',
      level: 12,
      cpuBattleWins: 1,
      cpuBattleLosses: 2,
      offlinePvpBattleWins: 3,
      offlinePvpBattleLosses: 4,
      onlinePvpBattleWins: 5,
      onlinePvpBattleLosses: 6,
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T01:00:00.000Z',
    });
  });

  it('rejects malformed required fields', () => {
    expect(rowToPublicProfile({ ...makeRow(), level: 0 })).toBeNull();
    expect(
      rowToPublicProfile({ ...makeRow(), online_pvp_battle_wins: -1 }),
    ).toBeNull();
  });
});

describe('saveCurrentPublicProfile', () => {
  it('upserts the current owner row', async () => {
    await expect(saveCurrentPublicProfile(makeUser())).resolves.toEqual({
      ok: true,
      ownerId: 'owner-a',
    });
    expect(mocks.from).toHaveBeenCalledWith('public_profiles');
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: 'owner-a', username: 'テスト' }),
      { onConflict: 'owner_id' },
    );
  });
});

describe('getPublicProfileByOwnerId', () => {
  it('fetches and normalizes a profile by owner id', async () => {
    const result = await getPublicProfileByOwnerId('owner-a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile?.username).toBe('テスト');
      expect(result.profile?.profileComment).toBe('よろしく！');
      expect(result.profile?.onlinePvpBattleWins).toBe(5);
    }
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', 'owner-a');
  });

  it('returns null when the profile does not exist', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getPublicProfileByOwnerId('missing')).resolves.toEqual({
      ok: true,
      profile: null,
    });
  });
});
