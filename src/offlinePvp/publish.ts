import { getDeckCards, isDeckBattleReady, normalizeDeckLayout } from '../deckSlots';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import type { Card, DeckLayout, UserProfile } from '../types';
import { ensureAnonymousUserId } from './auth';
import type { PublicGhostDeckRow } from './types';

export type PublishResult =
  | { ok: true; remoteId: string }
  | { ok: false; error: string };

function isCardArray(value: unknown): value is Card[] {
  return Array.isArray(value) && value.length === 5;
}

export function rowToPublicGhostDeck(row: PublicGhostDeckRow) {
  return {
    id: row.id,
    slotIndex: row.slot_index,
    deckName: row.deck_name?.trim() || `公開デッキ${row.slot_index + 1}`,
    authorName: row.author_name,
    authorLevel: row.author_level,
    offlinePvpWins: row.offline_pvp_wins,
    offlinePvpLosses: row.offline_pvp_losses,
    deck: structuredClone(row.deck),
    publishedAt: row.published_at,
    ownerId: row.owner_id,
  };
}

/** バトル可能デッキのみ公開可 */
export function canPublishDeck(deck: DeckLayout): boolean {
  return isDeckBattleReady(normalizeDeckLayout(deck));
}

export function isPublishedRemoteIdForOwner(
  row: { owner_id: string; slot_index: number } | null | undefined,
  ownerId: string,
  slotIndex: number,
): boolean {
  return (
    row?.owner_id === ownerId &&
    Math.floor(row.slot_index) === Math.floor(slotIndex)
  );
}

/** 認証切替前に、現在セッション owner の公開行をすべて削除する */
export async function deleteAllPublishedDecksForCurrentOwner(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const ownerId = await ensureAnonymousUserId();
  if (!ownerId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('public_ghost_decks')
    .delete()
    .eq('owner_id', ownerId);
  if (error) {
    console.warn(
      '[offlinePvp] failed to delete published decks before auth switch',
      error.message,
    );
  }
}

export async function upsertPublishedDeck(options: {
  slotIndex: number;
  deckName: string;
  deck: DeckLayout;
  user: UserProfile;
  remoteId?: string | null;
}): Promise<PublishResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase が設定されていません（.env を確認してください）' };
  }
  if (!canPublishDeck(options.deck)) {
    return {
      ok: false,
      error: 'バトル可能なデッキ（ロストなし5枚）だけ公開できます',
    };
  }

  const ownerId = await ensureAnonymousUserId();
  if (!ownerId) {
    return {
      ok: false,
      error:
        '匿名ログインに失敗しました。Supabase の Authentication → Anonymous を有効にしてください',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase が設定されていません' };
  }

  const cards = getDeckCards(normalizeDeckLayout(options.deck));
  const payload = {
    owner_id: ownerId,
    slot_index: options.slotIndex,
    deck_name: options.deckName.trim() || `デッキ${options.slotIndex + 1}`,
    author_name: options.user.username,
    author_level: options.user.level,
    offline_pvp_wins: options.user.offlinePvpBattleWins ?? 0,
    offline_pvp_losses: options.user.offlinePvpBattleLosses ?? 0,
    deck: cards,
    updated_at: new Date().toISOString(),
  };

  let remoteId = options.remoteId ?? null;
  if (remoteId) {
    const { data: existing, error: fetchError } = await supabase
      .from('public_ghost_decks')
      .select('id, owner_id, slot_index')
      .eq('id', remoteId)
      .maybeSingle();
    if (fetchError) {
      return { ok: false, error: fetchError.message };
    }
    if (
      !isPublishedRemoteIdForOwner(
        existing as { owner_id: string; slot_index: number } | null,
        ownerId,
        options.slotIndex,
      )
    ) {
      remoteId = null;
    }
  }

  if (remoteId) {
    const { data, error } = await supabase
      .from('public_ghost_decks')
      .update(payload)
      .eq('id', remoteId)
      .eq('owner_id', ownerId)
      .select('id')
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message };
    }
    if (data?.id) {
      return { ok: true, remoteId: data.id };
    }
  }

  const { data, error } = await supabase
    .from('public_ghost_decks')
    .upsert(payload, { onConflict: 'owner_id,slot_index' })
    .select('id')
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? '公開に失敗しました' };
  }
  return { ok: true, remoteId: data.id };
}

export async function unpublishDeck(options: {
  slotIndex: number;
  remoteId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase が設定されていません' };
  }
  const ownerId = await ensureAnonymousUserId();
  if (!ownerId) {
    return { ok: false, error: '匿名ログインに失敗しました' };
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase が設定されていません' };
  }

  const { error } = await supabase
    .from('public_ghost_decks')
    .delete()
    .eq('owner_id', ownerId)
    .eq('slot_index', options.slotIndex);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function fetchRemotePublicGhostDecks(options?: {
  ownerId?: string;
}): Promise<
  | { ok: true; rows: PublicGhostDeckRow[] }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'not_configured' };
  }
  await ensureAnonymousUserId();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'not_configured' };
  }

  let query = supabase
    .from('public_ghost_decks')
    .select(
      'id, owner_id, slot_index, deck_name, author_name, author_level, offline_pvp_wins, offline_pvp_losses, deck, published_at, updated_at',
    );
  if (options?.ownerId) {
    query = query.eq('owner_id', options.ownerId);
  }
  const { data, error } = await query.order(
    options?.ownerId ? 'slot_index' : 'author_level',
    { ascending: true },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows: PublicGhostDeckRow[] = [];
  for (const item of data ?? []) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string') continue;
    if (typeof record.owner_id !== 'string') continue;
    if (typeof record.slot_index !== 'number') continue;
    if (
      record.deck_name != null &&
      typeof record.deck_name !== 'string'
    ) {
      continue;
    }
    if (typeof record.author_name !== 'string') continue;
    if (typeof record.author_level !== 'number') continue;
    if (!isCardArray(record.deck)) continue;
    const wins =
      typeof record.offline_pvp_wins === 'number' && record.offline_pvp_wins >= 0
        ? Math.floor(record.offline_pvp_wins)
        : 0;
    const losses =
      typeof record.offline_pvp_losses === 'number' &&
      record.offline_pvp_losses >= 0
        ? Math.floor(record.offline_pvp_losses)
        : 0;
    rows.push({
      id: record.id,
      owner_id: record.owner_id,
      slot_index: Math.floor(record.slot_index),
      deck_name:
        typeof record.deck_name === 'string' ? record.deck_name : null,
      author_name: record.author_name,
      author_level: Math.floor(record.author_level),
      offline_pvp_wins: wins,
      offline_pvp_losses: losses,
      deck: record.deck,
      published_at:
        typeof record.published_at === 'string'
          ? record.published_at
          : new Date().toISOString(),
      updated_at:
        typeof record.updated_at === 'string'
          ? record.updated_at
          : new Date().toISOString(),
    });
  }
  return { ok: true, rows };
}
