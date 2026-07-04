import {
  hydrateSaveFromParsed,
  serializeSaveForStorage,
} from '../storage';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import type { SaveData } from '../types';
import type { CloudSaveResult, PlayerSaveSnapshot } from './types';

type PlayerSaveRow = {
  user_id: string;
  save_json: unknown;
  updated_at: string;
  client_updated_at: string;
};

async function requireAuthenticatedClient(): Promise<
  CloudSaveResult<{ client: NonNullable<ReturnType<typeof getSupabaseClient>>; userId: string }>
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return {
      ok: false,
      reason: 'not_authenticated',
      error: sessionError.message,
    };
  }
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      reason: 'not_authenticated',
      error: 'ログインしていません',
    };
  }

  return { ok: true, data: { client, userId } };
}

function rowToSnapshot(row: PlayerSaveRow): CloudSaveResult<PlayerSaveSnapshot> {
  if (!row.save_json || typeof row.save_json !== 'object' || Array.isArray(row.save_json)) {
    return {
      ok: false,
      reason: 'invalid_save',
      error: 'クラウドセーブの形式が不正です',
    };
  }
  const hydrated = hydrateSaveFromParsed(row.save_json as Record<string, unknown>);
  if (!hydrated) {
    return {
      ok: false,
      reason: 'invalid_save',
      error: 'クラウドセーブを読み込めませんでした',
    };
  }
  return {
    ok: true,
    data: {
      save: hydrated.save,
      clientUpdatedAt: row.client_updated_at,
      updatedAt: row.updated_at,
    },
  };
}

/**
 * 現在の認証ユーザーのクラウドセーブを取得する。
 * 行が無いときは `{ ok: true, data: null }`。
 */
export async function fetchPlayerSave(): Promise<
  CloudSaveResult<PlayerSaveSnapshot | null>
> {
  const auth = await requireAuthenticatedClient();
  if (!auth.ok) return auth;

  const { client, userId } = auth.data;
  const { data, error } = await client
    .from('player_saves')
    .select('user_id, save_json, updated_at, client_updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: 'fetch_failed',
      error: error.message,
    };
  }
  if (!data) {
    return { ok: true, data: null };
  }

  return rowToSnapshot(data as PlayerSaveRow);
}

/**
 * 現在の認証ユーザーのクラウドセーブを upsert する。
 * `clientUpdatedAt` は端末側の最終更新時刻（ISO 8601）。
 */
export async function upsertPlayerSave(
  save: SaveData,
  clientUpdatedAt: string,
): Promise<CloudSaveResult<void>> {
  const auth = await requireAuthenticatedClient();
  if (!auth.ok) return auth;

  const { client, userId } = auth.data;
  const saveJson = serializeSaveForStorage(save);
  const nowIso = new Date().toISOString();

  const { error } = await client.from('player_saves').upsert(
    {
      user_id: userId,
      save_json: saveJson,
      client_updated_at: clientUpdatedAt,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return {
      ok: false,
      reason: 'upsert_failed',
      error: error.message,
    };
  }

  return { ok: true, data: undefined };
}
