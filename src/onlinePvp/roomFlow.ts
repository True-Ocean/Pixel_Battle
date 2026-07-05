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
