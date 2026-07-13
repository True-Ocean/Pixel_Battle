import type { Card } from '../types';
import type { BattleActionChoice, BattleState, BoardPosition } from '../types/battle';
import { ensureAnonymousUserId } from '../auth/anonymous';
import { resolveTurn, promoteUnit } from '../game/resolveTurn';
import { getBattleResult, resolveNinjaStealthStalemate } from '../game';
import { buildOnlineTurnRandomSeed, createSeededRandom } from '../game/seededRandom';
import { pickPassAction } from '../game/actionChoices';
import { getSupabaseClient } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ONLINE_PVP_DISCONNECT_GRACE_SEC,
  ONLINE_PVP_ROOM_TTL_MINUTES,
} from './constants';
import {
  calcOnlinePvpBattleTransfer,
  clampOnlinePvpWalletTransfer,
  countFieldSurvivors,
} from './stakes';
import { generateRoomCode, normalizeRoomCodeInput, isValidRoomCode, padRoomCode } from './roomCode';
import {
  createOnlineBattleState,
  formationToSlots,
} from './battleSync';
import { balanceOnlineDecksForBattle } from './deckPowerBalance';
import { startNextTurn } from '../game/startNextTurn';
import {
  assertOnlineBattlePhaseInvariant,
  autoCompleteForcedPromotions,
  nextPhaseAfterClash,
  onlinePromotionNeeded,
  targetOnlineBattlePhaseForState,
} from './onlineBattleAuthority';
import { buildOnlineClashPlaybackEvents } from './onlineClashPlayback';
import type {
  OnlineBattleFormation,
  OnlineBattleRole,
  OnlineBattleRoom,
  OnlineBattleRoomRow,
  OnlineLastClash,
  OnlineRoomResult,
} from './types';
import { mapOnlineBattleRoom, type OnlineRoomErrorCode } from './types';

function roomExpiresAtIso(): string {
  return new Date(
    Date.now() + ONLINE_PVP_ROOM_TTL_MINUTES * 60 * 1000,
  ).toISOString();
}

function disconnectDeadlineIso(): string {
  return new Date(
    Date.now() + ONLINE_PVP_DISCONNECT_GRACE_SEC * 1000,
  ).toISOString();
}

/** pg_cron 未設定環境向け: 古いルーム削除を非同期で試行 */
function fireStaleOnlineRoomCleanup(supabase: SupabaseClient): void {
  void supabase.rpc('cleanup_stale_online_battle_rooms').then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn('[onlinePvp] cleanup_stale_online_battle_rooms:', error.message);
    }
  });
}

export async function fetchOnlineBattleRoom(
  id: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }
  const { data, error } = await supabase
    .from('online_battle_rooms')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, code: 'room_not_found', message: 'ルームが見つかりません' };
  }
  const row = data as OnlineBattleRoomRow;
  cacheOnlineRoomRow(id, row);
  return { ok: true, data: mapOnlineBattleRoom(row) };
}

async function fetchRoomById(id: string): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  return fetchOnlineBattleRoom(id);
}

async function advanceDeckSelectToSetup(
  roomId: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const basePatch = {
    status: 'setup' as const,
    host_setup_ready: false,
    guest_setup_ready: false,
    host_formation: null,
    guest_formation: null,
  };
  const withSetupStartedAt = await updateOnlineBattleRoom(roomId, {
    ...basePatch,
    setup_started_at: new Date().toISOString(),
  });
  if (withSetupStartedAt.ok) return withSetupStartedAt;

  const message = withSetupStartedAt.message.toLowerCase();
  if (
    message.includes('setup_started_at') ||
    message.includes('column') ||
    message.includes('schema')
  ) {
    return updateOnlineBattleRoom(roomId, basePatch);
  }
  return withSetupStartedAt;
}

export async function createOnlineBattleRoom(input: {
  hostName: string;
  hostLevel: number;
  hostWalletPx: number;
}): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }
  const userId = await ensureAnonymousUserId();
  if (!userId) {
    return { ok: false, code: 'auth_failed', message: 'ログインに失敗しました' };
  }

  fireStaleOnlineRoomCleanup(supabase);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('online_battle_rooms')
      .insert({
        code,
        host_user_id: userId,
        host_name: input.hostName,
        host_level: input.hostLevel,
        host_balance: Math.max(0, Math.round(input.hostWalletPx)),
        status: 'waiting',
        expires_at: roomExpiresAtIso(),
      })
      .select('*')
      .single();
    if (!error && data) {
      return { ok: true, data: mapOnlineBattleRoom(data as OnlineBattleRoomRow) };
    }
    if (error?.code !== '23505') {
      return {
        ok: false,
        code: 'network_error',
        message: error?.message ?? 'ルーム作成に失敗しました',
      };
    }
  }
  return { ok: false, code: 'network_error', message: 'ルーム作成に失敗しました' };
}

const JOIN_RPC_ERROR_MESSAGES: Record<string, { code: OnlineRoomErrorCode; message: string }> = {
  auth_failed: { code: 'auth_failed', message: 'ログインに失敗しました' },
  invalid_code: { code: 'room_not_found', message: '6桁のルームコードを入力してください' },
  room_not_found: {
    code: 'room_not_found',
    message: 'ルームが見つかりません。コードと有効期限を確認してください',
  },
  room_closed: { code: 'room_closed', message: 'ルームは終了しています' },
  room_expired: { code: 'room_expired', message: 'ルームの有効期限が切れています' },
  room_full: { code: 'room_full', message: 'ルームは満員です' },
  room_not_joinable: { code: 'room_full', message: '参加できない状態です' },
};

type JoinRpcPayload = {
  ok?: boolean;
  error?: string;
  room?: OnlineBattleRoomRow;
};

const JOIN_RPC_NOT_DEPLOYED_MESSAGE =
  '参加機能が Supabase に未設定です。SQL Editor で supabase/migrations/008_online_battle_rooms_join_fix.sql（または 007）を実行してください。';

function parseJoinRpcPayload(data: unknown): JoinRpcPayload | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as JoinRpcPayload;
    } catch {
      return null;
    }
  }
  return data as JoinRpcPayload;
}

function isJoinRpcMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    error.message?.includes('join_online_battle_room') === true ||
    error.message?.includes('Could not find the function') === true
  );
}

async function joinOnlineBattleRoomViaRpc(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  input: { code: string; guestName: string; guestLevel: number },
): Promise<
  | { kind: 'success'; result: OnlineRoomResult<OnlineBattleRoom> }
  | { kind: 'missing_rpc' }
  | { kind: 'failed'; result: OnlineRoomResult<OnlineBattleRoom> }
> {
  const lookupCode = padRoomCode(input.code);
  const { data, error } = await supabase.rpc('join_online_battle_room', {
    p_code: lookupCode,
    p_guest_name: input.guestName,
    p_guest_level: input.guestLevel,
  });

  if (error) {
    if (isJoinRpcMissing(error)) {
      console.warn('[onlinePvp] join_online_battle_room RPC is not deployed', error.message);
      return { kind: 'missing_rpc' };
    }
    return {
      kind: 'failed',
      result: {
        ok: false,
        code: 'network_error',
        message: error.message ?? 'ルーム参加に失敗しました',
      },
    };
  }

  const payload = parseJoinRpcPayload(data);
  if (!payload?.ok) {
    const key = payload?.error ?? 'room_not_found';
    const mapped = JOIN_RPC_ERROR_MESSAGES[key] ?? JOIN_RPC_ERROR_MESSAGES.room_not_found!;
    return {
      kind: 'failed',
      result: { ok: false, code: mapped.code, message: mapped.message },
    };
  }
  if (!payload.room) {
    return {
      kind: 'failed',
      result: {
        ok: false,
        code: 'room_not_found',
        message: JOIN_RPC_ERROR_MESSAGES.room_not_found!.message,
      },
    };
  }
  return {
    kind: 'success',
    result: { ok: true, data: mapOnlineBattleRoom(payload.room) },
  };
}

async function joinOnlineBattleRoomDirect(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  userId: string,
  input: { code: string; guestName: string; guestLevel: number },
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const lookupCode = padRoomCode(input.code);

  const { data: existing, error: fetchError } = await supabase
    .from('online_battle_rooms')
    .select('*')
    .eq('code', lookupCode)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      code: 'network_error',
      message: fetchError.message ?? 'ルームの検索に失敗しました',
    };
  }
  if (!existing) {
    return {
      ok: false,
      code: 'room_not_found',
      message: JOIN_RPC_ERROR_MESSAGES.room_not_found!.message,
    };
  }
  const row = existing as OnlineBattleRoomRow;
  if (row.status === 'closed') {
    return { ok: false, code: 'room_closed', message: 'ルームは終了しています' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, code: 'room_expired', message: 'ルームの有効期限が切れています' };
  }
  if (row.host_user_id === userId) {
    return { ok: true, data: mapOnlineBattleRoom(row) };
  }
  if (row.guest_user_id && row.guest_user_id !== userId) {
    return { ok: false, code: 'room_full', message: 'ルームは満員です' };
  }
  if (row.guest_user_id === userId) {
    return { ok: true, data: mapOnlineBattleRoom(row) };
  }
  if (row.status !== 'waiting') {
    return { ok: false, code: 'room_full', message: '参加できない状態です' };
  }

  const { data, error } = await supabase
    .from('online_battle_rooms')
    .update({
      guest_user_id: userId,
      guest_name: input.guestName,
      guest_level: input.guestLevel,
      guest_balance: 0,
      status: 'deck_select',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'waiting')
    .is('guest_user_id', null)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return { ok: false, code: 'room_full', message: '参加できませんでした' };
  }
  return { ok: true, data: mapOnlineBattleRoom(data as OnlineBattleRoomRow) };
}

export async function joinOnlineBattleRoom(input: {
  code: string;
  guestName: string;
  guestLevel: number;
}): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }
  const userId = await ensureAnonymousUserId();
  if (!userId) {
    return { ok: false, code: 'auth_failed', message: 'ログインに失敗しました' };
  }

  const rpcAttempt = await joinOnlineBattleRoomViaRpc(supabase, input);
  if (rpcAttempt.kind === 'success') return rpcAttempt.result;
  if (rpcAttempt.kind === 'failed') return rpcAttempt.result;

  const directResult = await joinOnlineBattleRoomDirect(supabase, userId, input);
  if (directResult.ok) return directResult;

  if (directResult.code === 'room_not_found') {
    return {
      ok: false,
      code: 'not_configured',
      message: JOIN_RPC_NOT_DEPLOYED_MESSAGE,
    };
  }
  return directResult;
}

export async function updateOnlineBattleRoom(
  roomId: string,
  patch: Record<string, unknown>,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }
  const { data, error } = await supabase
    .from('online_battle_rooms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .select('*')
    .single();
  if (error || !data) {
    return { ok: false, code: 'network_error', message: error?.message ?? '更新失敗' };
  }
  const row = data as OnlineBattleRoomRow;
  cacheOnlineRoomRow(roomId, row);
  return { ok: true, data: mapOnlineBattleRoom(row) };
}

export async function submitOnlineDeck(
  roomId: string,
  role: 'host' | 'guest',
  deck: Card[],
  walletPx: number,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const balance = Math.max(0, Math.round(walletPx));
  const patch =
    role === 'host'
      ? { host_deck: deck, host_deck_change: false, host_balance: balance }
      : { guest_deck: deck, guest_deck_change: false, guest_balance: balance };
  return updateOnlineBattleRoom(roomId, patch);
}

export async function syncOnlineWalletBalance(
  roomId: string,
  role: 'host' | 'guest',
  walletPx: number,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const balance = Math.max(0, Math.round(walletPx));
  const patch =
    role === 'host' ? { host_balance: balance } : { guest_balance: balance };
  return updateOnlineBattleRoom(roomId, patch);
}

export async function requestOnlineDeckChange(
  roomId: string,
  role: 'host' | 'guest',
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const patch =
    role === 'host'
      ? {
          host_deck_change: true,
          host_deck: null,
          host_setup_ready: false,
          host_formation: null,
        }
      : {
          guest_deck_change: true,
          guest_deck: null,
          guest_setup_ready: false,
          guest_formation: null,
        };
  return updateOnlineBattleRoom(roomId, {
    ...patch,
    status: 'deck_select',
    setup_started_at: null,
    host_rematch_ready: false,
    guest_rematch_ready: false,
    battle_state: null,
    host_pending_action: null,
    guest_pending_action: null,
  });
}

export async function tryAdvanceToSetup(
  room: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (!room.hostDeck || !room.guestDeck) {
    return { ok: true, data: room };
  }
  if (room.status === 'setup') {
    const fresh = await fetchRoomById(room.id);
    return fresh.ok ? fresh : { ok: true, data: room };
  }
  if (room.status !== 'deck_select') {
    return { ok: true, data: room };
  }
  return advanceDeckSelectToSetup(room.id);
}

export async function submitOnlineSetup(
  roomId: string,
  role: 'host' | 'guest',
  formation: OnlineBattleFormation,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const patch =
    role === 'host'
      ? { host_formation: formation, host_setup_ready: true }
      : { guest_formation: formation, guest_setup_ready: true };
  const updated = await updateOnlineBattleRoom(roomId, patch);
  if (!updated.ok) return updated;
  return tryStartBattle(updated.data);
}

async function tryStartBattle(
  room: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (
    room.status !== 'setup' ||
    !room.hostSetupReady ||
    !room.guestSetupReady ||
    !room.hostDeck ||
    !room.guestDeck ||
    !room.hostFormation ||
    !room.guestFormation
  ) {
    return { ok: true, data: room };
  }
  const balanced = balanceOnlineDecksForBattle(room.hostDeck, room.guestDeck);
  const hostSlots = formationToSlots(room.hostFormation, balanced.hostDeck);
  const guestSlots = formationToSlots(room.guestFormation, balanced.guestDeck);
  const battleState = createOnlineBattleState(hostSlots, guestSlots);
  const stateAfterPromo = autoCompleteForcedPromotions(battleState);
  const initialPhase = onlinePromotionNeeded(stateAfterPromo)
    ? 'promotion'
    : 'select';
  return updateOnlineBattleRoom(room.id, {
    status: 'battle',
    battle_state: stateAfterPromo,
    host_pending_action: null,
    guest_pending_action: null,
    battle_revision: 1,
    battle_phase: initialPhase,
    last_clash: null,
    host_deck: balanced.hostDeck,
    guest_deck: balanced.guestDeck,
    power_balance_applied: balanced.applied,
  });
}

async function fetchRoomAfterConditionalMiss(
  roomId: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  return fetchRoomById(roomId);
}

/** battle_state 更新時に revision を +1 する */
function battleStatePatch(
  room: OnlineBattleRoom,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...patch,
    battle_revision: room.battleRevision + 1,
  };
}

async function advanceTurnStartInternal(
  roomOrId: OnlineBattleRoom | string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  let room: OnlineBattleRoom;
  if (typeof roomOrId === 'string') {
    const fetched = await fetchRoomById(roomOrId);
    if (!fetched.ok) return fetched;
    room = fetched.data;
  } else {
    room = roomOrId;
  }
  if (room.status !== 'battle' || !room.battleState) {
    return { ok: true, data: room };
  }
  if (room.battlePhase !== 'turn_start') {
    return { ok: true, data: room };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }

  const promotedState = autoCompleteForcedPromotions(room.battleState);
  if (onlinePromotionNeeded(promotedState)) {
    return updateOnlineBattleRoom(
      room.id,
      battleStatePatch(room, {
        battle_state: promotedState,
        battle_phase: 'promotion',
      }),
    );
  }
  const turnStart = startNextTurn(promotedState);
  let afterDot = autoCompleteForcedPromotions(turnStart.stateAfterDot);
  // 毒 DoT で撃破→前衛空きが発生しうる。assert で落とさず promotion へ。
  const nextPhase = onlinePromotionNeeded(afterDot) ? 'promotion' : 'select';
  if (nextPhase === 'select') {
    assertOnlineBattlePhaseInvariant('select', afterDot);
  }
  const enrichedLastClash: OnlineLastClash | null = room.lastClash
    ? {
        ...room.lastClash,
        poisonDots: turnStart.poisonDots,
        stateBeforePoison: turnStart.stateBeforeDot,
        stateAfterPoison: afterDot,
      }
    : null;
  const preRevision = room.battleRevision;
  const { data, error } = await supabase
    .from('online_battle_rooms')
    .update({
      battle_state: afterDot,
      battle_phase: nextPhase,
      // last_clash はクライアント再生用に残す（次 clash で上書き）
      last_clash: enrichedLastClash,
      battle_revision: preRevision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id)
    .eq('battle_phase', 'turn_start')
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false, code: 'network_error', message: error.message };
  }

  if (!data) {
    return fetchRoomAfterConditionalMiss(room.id);
  }

  const row = data as OnlineBattleRoomRow;
  cacheOnlineRoomRow(room.id, row);
  const mapped = mapOnlineBattleRoom(row);
  if (mapped.battleState && getBattleResult(mapped.battleState) != null) {
    return finalizeOnlineBattleIfEnded(mapped);
  }
  return { ok: true, data: mapped };
}

async function chainTurnStartToSelect(
  room: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (room.battleState && getBattleResult(room.battleState) != null) {
    return finalizeOnlineBattleIfEnded(room);
  }
  if (room.battlePhase === 'turn_start') {
    return advanceTurnStartInternal(room);
  }
  return { ok: true, data: room };
}

async function resolveOnlineClash(
  roomOrId: OnlineBattleRoom | string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  let room: OnlineBattleRoom;
  if (typeof roomOrId === 'string') {
    const fetched = await fetchRoomById(roomOrId);
    if (!fetched.ok) return fetched;
    room = fetched.data;
  } else {
    room = roomOrId;
  }
  if (
    room.status !== 'battle' ||
    !room.battleState ||
    !room.hostPendingAction ||
    !room.guestPendingAction
  ) {
    return { ok: true, data: room };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }

  const hostChoice = room.hostPendingAction;
  const guestChoice = room.guestPendingAction;
  const preClashRevision = room.battleRevision;
  const clashTurn = room.battleState.turn;
  const preClashState = room.battleState;

  const result = resolveTurn(
    preClashState,
    { player: hostChoice, cpu: guestChoice },
    {
      random: createSeededRandom(
        buildOnlineTurnRandomSeed(
          room.id,
          clashTurn,
          hostChoice,
          guestChoice,
        ),
      ),
    },
  );

  const stateAfterClash = autoCompleteForcedPromotions(result.state);
  const nextPhase = nextPhaseAfterClash(stateAfterClash);
  const lastClash: OnlineLastClash = {
    turn: clashTurn,
    hostChoice,
    guestChoice,
    preClashRevision,
    playbackEvents: buildOnlineClashPlaybackEvents(preClashState, result),
  };

  const { data, error } = await supabase
    .from('online_battle_rooms')
    .update({
      battle_state: stateAfterClash,
      battle_phase: nextPhase,
      last_clash: lastClash,
      host_pending_action: null,
      guest_pending_action: null,
      battle_revision: preClashRevision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id)
    .not('host_pending_action', 'is', null)
    .not('guest_pending_action', 'is', null)
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false, code: 'network_error', message: error.message };
  }

  if (!data) {
    const refetched = await fetchRoomAfterConditionalMiss(room.id);
    if (!refetched.ok) return refetched;
    if (refetched.data.battleRevision > preClashRevision) {
      return chainTurnStartToSelect(refetched.data);
    }
    return { ok: true, data: room };
  }

  const row = data as OnlineBattleRoomRow;
  cacheOnlineRoomRow(room.id, row);
  const resultRoom = mapOnlineBattleRoom(row);
  if (resultRoom.battleState && getBattleResult(resultRoom.battleState) != null) {
    return finalizeOnlineBattleIfEnded(resultRoom);
  }
  return chainTurnStartToSelect(resultRoom);
}

/** battle_phase と battle_state の不整合を idempotent に修復する（dev / 手動復旧のみ） */
export async function repairOnlineBattlePhase(
  roomOrId: OnlineBattleRoom | string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  let room: OnlineBattleRoom;
  if (typeof roomOrId === 'string') {
    const fetched = await fetchRoomById(roomOrId);
    if (!fetched.ok) return fetched;
    room = fetched.data;
  } else {
    room = roomOrId;
  }
  if (!import.meta.env.DEV) {
    return { ok: true, data: room };
  }
  if (room.status !== 'battle' || !room.battleState) {
    return { ok: true, data: room };
  }

  const normalized = autoCompleteForcedPromotions(room.battleState);
  const targetPhase = targetOnlineBattlePhaseForState(
    normalized,
    room.battlePhase,
  );
  if (!targetPhase) {
    if (normalized !== room.battleState) {
      return updateOnlineBattleRoom(
        room.id,
        battleStatePatch(room, { battle_state: normalized }),
      );
    }
    return { ok: true, data: room };
  }

  return updateOnlineBattleRoom(
    room.id,
    battleStatePatch(room, {
      battle_state: normalized,
      battle_phase: targetPhase,
    }),
  );
}

export async function submitOnlinePromotion(
  roomId: string,
  role: OnlineBattleRole,
  from: BoardPosition,
  to: BoardPosition,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const fresh = await fetchRoomById(roomId);
  if (!fresh.ok) return fresh;
  const room = fresh.data;
  if (room.status !== 'battle' || !room.battleState) {
    return { ok: false, code: 'room_closed', message: 'バトル中ではありません' };
  }
  if (room.battlePhase !== 'promotion') {
    return { ok: false, code: 'network_error', message: '昇格フェーズではありません' };
  }

  const side = role === 'host' ? 'player' : 'cpu';
  const nextState = autoCompleteForcedPromotions(
    promoteUnit(room.battleState, side, from, to),
  );
  if (nextState === room.battleState) {
    return { ok: false, code: 'network_error', message: '昇格できません' };
  }

  const stillNeedsPromotion = onlinePromotionNeeded(nextState);
  const updated = await updateOnlineBattleRoom(
    roomId,
    battleStatePatch(room, {
      battle_state: nextState,
      battle_phase: stillNeedsPromotion ? 'promotion' : 'turn_start',
    }),
  );
  if (!updated.ok) return updated;
  if (!stillNeedsPromotion) {
    return chainTurnStartToSelect(updated.data);
  }
  return updated;
}

export async function applyOnlineNinjaStalemateBreak(
  roomId: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const fresh = await fetchRoomById(roomId);
  if (!fresh.ok) return fresh;
  const room = fresh.data;
  if (room.status !== 'battle' || !room.battleState || room.battlePhase !== 'select') {
    return { ok: true, data: room };
  }
  const { state: nextState } = resolveNinjaStealthStalemate(room.battleState);
  return updateOnlineBattleRoom(
    roomId,
    battleStatePatch(room, { battle_state: nextState }),
  );
}

export async function submitOnlineBattleChoice(
  roomId: string,
  role: 'host' | 'guest',
  choice: BattleActionChoice,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const fresh = await fetchRoomById(roomId);
  if (!fresh.ok) return fresh;
  if (fresh.data.status !== 'battle') {
    return { ok: false, code: 'room_closed', message: 'バトル中ではありません' };
  }

  const patch: Record<string, BattleActionChoice | null> =
    role === 'host'
      ? { host_pending_action: choice }
      : { guest_pending_action: choice };

  const updated = await updateOnlineBattleRoom(roomId, patch);
  if (!updated.ok) return updated;

  if (
    updated.data.hostPendingAction &&
    updated.data.guestPendingAction &&
    updated.data.battlePhase === 'select'
  ) {
    return resolveOnlineClash(updated.data);
  }
  return updated;
}

export async function applyOnlineBattleForfeit(
  roomId: string,
  forfeitingRole: 'host' | 'guest',
  currentRoom: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const winnerRole = forfeitingRole === 'host' ? 'guest' : 'host';
  return finalizeOnlineBattle(roomId, currentRoom, winnerRole, 0, true);
}

export async function finalizeOnlineBattleIfEnded(
  room: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (room.status === 'rematch_wait') {
    return { ok: true, data: room };
  }
  if (room.status !== 'battle' || !room.battleState) {
    return { ok: true, data: room };
  }
  const result = getBattleResult(room.battleState);
  if (result == null) {
    return { ok: true, data: room };
  }
  const winnerRole: 'host' | 'guest' = result === 'player' ? 'host' : 'guest';
  const winnerUnits =
    winnerRole === 'host' ? room.battleState.player : room.battleState.cpu;
  const survivors = countFieldSurvivors(winnerUnits);
  const desired = calcOnlinePvpBattleTransfer(survivors);
  return finalizeOnlineBattle(room.id, room, winnerRole, desired, false);
}

async function finalizeOnlineBattle(
  roomId: string,
  room: OnlineBattleRoom,
  winnerRole: 'host' | 'guest',
  desiredTransfer: number,
  forfeit: boolean,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (room.status === 'rematch_wait') {
    return { ok: true, data: room };
  }

  const desired = forfeit
    ? calcOnlinePvpBattleTransfer(1)
    : desiredTransfer;
  const loserBalance =
    winnerRole === 'host' ? (room.guestBalance ?? 0) : room.hostBalance;
  const transfer = clampOnlinePvpWalletTransfer(desired, loserBalance);
  const hostBalance =
    winnerRole === 'host'
      ? room.hostBalance + transfer
      : room.hostBalance - transfer;
  const guestBalance =
    winnerRole === 'guest'
      ? (room.guestBalance ?? 0) + transfer
      : (room.guestBalance ?? 0) - transfer;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, code: 'not_configured', message: 'Supabase 未設定' };
  }

  // 両クライアントが同時に終了検知しても、status=battle のときだけ1回確定する
  const { data, error } = await supabase
    .from('online_battle_rooms')
    .update({
      status: 'rematch_wait',
      last_transfer_px: transfer,
      host_balance: Math.max(0, hostBalance),
      guest_balance: Math.max(0, guestBalance),
      host_rematch_ready: false,
      guest_rematch_ready: false,
      host_pending_action: null,
      guest_pending_action: null,
      disconnect_user_id: null,
      disconnect_deadline: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('status', 'battle')
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false, code: 'network_error', message: error.message };
  }
  if (!data) {
    return fetchRoomById(roomId);
  }
  const row = data as OnlineBattleRoomRow;
  cacheOnlineRoomRow(roomId, row);
  return { ok: true, data: mapOnlineBattleRoom(row) };
}

export async function submitOnlineRematchReady(
  roomId: string,
  role: 'host' | 'guest',
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  const patch =
    role === 'host'
      ? { host_rematch_ready: true }
      : { guest_rematch_ready: true };
  const updated = await updateOnlineBattleRoom(roomId, patch);
  if (!updated.ok) return updated;
  const room = updated.data;
  if (!room.hostRematchReady || !room.guestRematchReady) {
    return updated;
  }
  return updateOnlineBattleRoom(roomId, {
    status: 'deck_select',
    host_deck: null,
    guest_deck: null,
    host_setup_ready: false,
    guest_setup_ready: false,
    host_formation: null,
    guest_formation: null,
    battle_state: null,
    host_pending_action: null,
    guest_pending_action: null,
    host_rematch_ready: false,
    guest_rematch_ready: false,
    host_deck_change: false,
    guest_deck_change: false,
    last_transfer_px: null,
    power_balance_applied: false,
  });
}

export async function closeOnlineBattleRoom(
  roomId: string,
  closedByRole?: OnlineBattleRole,
): Promise<OnlineRoomResult<null>> {
  const patch: Record<string, unknown> = { status: 'closed' };
  if (closedByRole) {
    patch.closed_by_role = closedByRole;
  }
  const result = await updateOnlineBattleRoom(roomId, patch);
  if (!result.ok) return result;
  const supabase = getSupabaseClient();
  if (supabase) {
    fireStaleOnlineRoomCleanup(supabase);
  }
  return { ok: true, data: null };
}

export async function markOnlineDisconnect(
  roomId: string,
  userId: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  return updateOnlineBattleRoom(roomId, {
    disconnect_user_id: userId,
    disconnect_deadline: disconnectDeadlineIso(),
  });
}

export async function clearOnlineDisconnect(
  roomId: string,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  return updateOnlineBattleRoom(roomId, {
    disconnect_user_id: null,
    disconnect_deadline: null,
  });
}

type OnlineRoomListener = (room: OnlineBattleRoom) => void;

interface OnlineRoomSubscription {
  listeners: Set<OnlineRoomListener>;
  teardown: () => void;
  /** Realtime 部分 UPDATE をマージするための直近完全行 */
  lastRow: OnlineBattleRoomRow | null;
}

const onlineRoomSubscriptions = new Map<string, OnlineRoomSubscription>();

/** REST / Realtime で得た完全行をキャッシュ（subscribe 前でも no-op） */
function cacheOnlineRoomRow(roomId: string, row: OnlineBattleRoomRow): void {
  const sub = onlineRoomSubscriptions.get(roomId);
  if (sub) {
    sub.lastRow = row;
  }
}

function mergeOnlineBattleRoomRow(
  current: OnlineBattleRoomRow | null,
  partial: Partial<OnlineBattleRoomRow>,
): OnlineBattleRoomRow {
  if (!current) {
    return partial as OnlineBattleRoomRow;
  }
  return { ...current, ...partial };
}

function notifyOnlineRoomListeners(roomId: string, room: OnlineBattleRoom): void {
  const sub = onlineRoomSubscriptions.get(roomId);
  if (!sub) return;
  for (const listener of sub.listeners) {
    listener(room);
  }
}

export function subscribeOnlineBattleRoom(
  roomId: string,
  onUpdate: (room: OnlineBattleRoom) => void,
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  let sub = onlineRoomSubscriptions.get(roomId);
  if (!sub) {
    const listeners = new Set<OnlineRoomListener>();
    const channel = supabase
      .channel(`online-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_battle_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const current = onlineRoomSubscriptions.get(roomId);
          if (!current) return;
          // default REPLICA IDENTITY では変更列のみ届く。直近行へマージしてから map する。
          const merged = mergeOnlineBattleRoomRow(
            current.lastRow,
            payload.new as Partial<OnlineBattleRoomRow>,
          );
          current.lastRow = merged;
          notifyOnlineRoomListeners(roomId, mapOnlineBattleRoom(merged));
        },
      )
      .subscribe();

    sub = {
      listeners,
      lastRow: null,
      teardown: () => {
        void supabase.removeChannel(channel);
        onlineRoomSubscriptions.delete(roomId);
      },
    };
    onlineRoomSubscriptions.set(roomId, sub);
  }

  sub.listeners.add(onUpdate);

  void fetchRoomById(roomId).then((result) => {
    if (result.ok && sub!.listeners.has(onUpdate)) {
      onUpdate(result.data);
    }
  });

  return () => {
    const current = onlineRoomSubscriptions.get(roomId);
    if (!current) return;
    current.listeners.delete(onUpdate);
    if (current.listeners.size === 0) {
      current.teardown();
    }
  };
}

export async function submitOnlinePassIfStuck(
  room: OnlineBattleRoom,
): Promise<OnlineRoomResult<OnlineBattleRoom>> {
  if (room.status !== 'battle' || !room.battleState) {
    return { ok: true, data: room };
  }
  let next = room;
  if (!room.hostPendingAction) {
    const pass = pickPassAction(room.battleState, 'player');
    const r = await submitOnlineBattleChoice(room.id, 'host', pass);
    if (r.ok) next = r.data;
  }
  if (!next.guestPendingAction && next.battleState) {
    const pass = pickPassAction(next.battleState, 'cpu');
    const r = await submitOnlineBattleChoice(next.id, 'guest', pass);
    if (r.ok) next = r.data;
  }
  return { ok: true, data: next };
}

export type { BattleState };
