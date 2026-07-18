import { ensureAnonymousUserId } from '../auth';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import type { PixelGrid, UserProfile } from '../types';
import type {
  GetPublicProfileResult,
  PublicProfile,
  PublicProfileRow,
  SavePublicProfileResult,
} from './types';

const PUBLIC_PROFILE_COLUMNS = [
  'owner_id',
  'username',
  'avatar',
  'level',
  'cpu_battle_wins',
  'cpu_battle_losses',
  'offline_pvp_battle_wins',
  'offline_pvp_battle_losses',
  'online_pvp_battle_wins',
  'online_pvp_battle_losses',
  'created_at',
  'updated_at',
].join(', ');

export type PublicProfileUpsertRow = Omit<PublicProfileRow, 'created_at'>;

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

function normalizeAvatar(raw: unknown): UserProfile['avatar'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as { pixels?: unknown; canvasSize?: unknown };
  const canvasSize = candidate.canvasSize;
  const pixels = candidate.pixels;
  if (
    !Number.isInteger(canvasSize) ||
    (canvasSize as number) < 16 ||
    (canvasSize as number) > 34 ||
    !Array.isArray(pixels) ||
    pixels.length !== canvasSize
  ) {
    return undefined;
  }
  const valid = pixels.every(
    (row) =>
      Array.isArray(row) &&
      row.length === canvasSize &&
      row.every((color) => color === null || typeof color === 'string'),
  );
  if (!valid) return undefined;
  return {
    canvasSize: canvasSize as number,
    pixels: pixels.map((row) => [...row]) as PixelGrid,
  };
}

export function publicProfileUpsertRow(
  ownerId: string,
  user: UserProfile,
  now = new Date(),
): PublicProfileUpsertRow {
  return {
    owner_id: ownerId,
    username: user.username.trim(),
    avatar: user.avatar ? structuredClone(user.avatar) : null,
    level: Math.max(1, Math.floor(user.level)),
    cpu_battle_wins: Math.max(0, Math.floor(user.cpuBattleWins)),
    cpu_battle_losses: Math.max(0, Math.floor(user.cpuBattleLosses)),
    offline_pvp_battle_wins: Math.max(
      0,
      Math.floor(user.offlinePvpBattleWins),
    ),
    offline_pvp_battle_losses: Math.max(
      0,
      Math.floor(user.offlinePvpBattleLosses),
    ),
    online_pvp_battle_wins: Math.max(
      0,
      Math.floor(user.onlinePvpBattleWins),
    ),
    online_pvp_battle_losses: Math.max(
      0,
      Math.floor(user.onlinePvpBattleLosses),
    ),
    updated_at: now.toISOString(),
  };
}

export function rowToPublicProfile(raw: unknown): PublicProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.owner_id !== 'string' ||
    row.owner_id.trim() === '' ||
    typeof row.username !== 'string' ||
    row.username.trim() === '' ||
    typeof row.level !== 'number' ||
    !Number.isFinite(row.level) ||
    row.level < 1 ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    return null;
  }

  const cpuBattleWins = nonNegativeInteger(row.cpu_battle_wins);
  const cpuBattleLosses = nonNegativeInteger(row.cpu_battle_losses);
  const offlinePvpBattleWins = nonNegativeInteger(
    row.offline_pvp_battle_wins,
  );
  const offlinePvpBattleLosses = nonNegativeInteger(
    row.offline_pvp_battle_losses,
  );
  const onlinePvpBattleWins = nonNegativeInteger(row.online_pvp_battle_wins);
  const onlinePvpBattleLosses = nonNegativeInteger(
    row.online_pvp_battle_losses,
  );
  if (
    cpuBattleWins == null ||
    cpuBattleLosses == null ||
    offlinePvpBattleWins == null ||
    offlinePvpBattleLosses == null ||
    onlinePvpBattleWins == null ||
    onlinePvpBattleLosses == null
  ) {
    return null;
  }

  const avatar = normalizeAvatar(row.avatar);
  return {
    ownerId: row.owner_id,
    username: row.username.trim(),
    ...(avatar ? { avatar } : {}),
    level: Math.floor(row.level),
    cpuBattleWins,
    cpuBattleLosses,
    offlinePvpBattleWins,
    offlinePvpBattleLosses,
    onlinePvpBattleWins,
    onlinePvpBattleLosses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveCurrentPublicProfile(
  user: UserProfile,
): Promise<SavePublicProfileResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  const ownerId = await ensureAnonymousUserId();
  if (!ownerId) return { ok: false, reason: 'auth_failed' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'not_configured' };

  const { error } = await client
    .from('public_profiles')
    .upsert(publicProfileUpsertRow(ownerId, user), {
      onConflict: 'owner_id',
    });
  if (error) {
    return { ok: false, reason: 'save_failed', error: error.message };
  }
  return { ok: true, ownerId };
}

export async function getPublicProfileByOwnerId(
  ownerId: string,
): Promise<GetPublicProfileResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  if (!(await ensureAnonymousUserId())) {
    return { ok: false, reason: 'auth_failed' };
  }
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'not_configured' };

  const { data, error } = await client
    .from('public_profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: 'fetch_failed', error: error.message };
  }
  if (data == null) return { ok: true, profile: null };
  const profile = rowToPublicProfile(data);
  if (!profile) return { ok: false, reason: 'invalid_response' };
  return { ok: true, profile };
}
