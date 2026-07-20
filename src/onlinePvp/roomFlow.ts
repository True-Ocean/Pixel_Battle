import type { OnlineBattleRoom } from './types';

/** battleSetup から onlinePvp（デッキ選択）へ戻すべき deck_select か */
export function shouldReturnToOnlineDeckSelect(room: OnlineBattleRoom): boolean {
  if (room.status !== 'deck_select') return false;
  if (room.hostDeck && room.guestDeck) return false;
  if (!room.hostDeck && !room.guestDeck) return true;
  return room.hostDeckChange || room.guestDeckChange;
}

export function isPostOnlineDeckSelectStatus(
  status: OnlineBattleRoom['status'],
): boolean {
  return status === 'setup' || status === 'battle' || status === 'rematch_wait';
}

/**
 * Realtime / 遅延レスポンスの古い行で battle_state を巻き戻さない。
 * battle 中は battle_revision の単調増加を正とする（同 revision の pending 更新は許可）。
 */
export function shouldApplyOnlineRoomUpdate(
  current: OnlineBattleRoom | null,
  incoming: OnlineBattleRoom,
): boolean {
  if (!incoming.id || !incoming.status) return false;
  if (!current || current.id !== incoming.id) return true;
  if (incoming.status !== current.status) return true;
  if (current.status === 'battle' && incoming.status === 'battle') {
    // 部分 Realtime payload で battle_state が消えた更新は捨てる
    if (current.battleState != null && incoming.battleState == null) {
      return false;
    }
    if (incoming.battleRevision !== current.battleRevision) {
      return incoming.battleRevision > current.battleRevision;
    }
    // 同 revision: pending / last_clash 追記などは updatedAt で判定
    return incoming.updatedAt >= current.updatedAt;
  }
  return incoming.updatedAt >= current.updatedAt;
}
