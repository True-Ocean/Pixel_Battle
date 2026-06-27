import type { MissionEventType } from './types';

/** 「挑戦」タップ時の遷移先 */
export type MissionChallengeTarget =
  | { kind: 'battleHub' }
  | { kind: 'createCard' }
  | { kind: 'editCard' }
  | { kind: 'deckReorder' }
  | { kind: 'deckCardDetail' }
  | { kind: 'records' };

/** イベント種別に対応する遷移先。ログイン系は遷移先なし */
export function getMissionChallengeTarget(
  eventType: MissionEventType,
): MissionChallengeTarget | null {
  switch (eventType) {
    case 'battle_win':
    case 'cpu_battle_win':
    case 'battle_play':
    case 'battle_log_viewed':
    case 'deck_win_with_attribute':
    case 'deck_win_with_rarity':
      return { kind: 'battleHub' };
    case 'card_created':
    case 'attribute_owned':
    case 'rarity_owned':
      return { kind: 'createCard' };
    case 'card_edit_saved':
      return { kind: 'editCard' };
    case 'deck_reordered':
      return { kind: 'deckReorder' };
    case 'attribute_battle_guide_viewed':
    case 'attribute_retouch':
    case 'limit_break':
      return { kind: 'deckCardDetail' };
    case 'history_opponent_detail_viewed':
    case 'history_rematch_play':
    case 'history_rematch_win':
      return { kind: 'records' };
    case 'card_deleted':
    case 'card_revived':
    case 'memory_album_saved':
    case 'card_renamed':
    case 'card_note_saved':
    case 'canvas_resized':
    case 'attribute_selected':
      return { kind: 'deckCardDetail' };
    case 'app_open':
      return null;
  }
}

export function canShowMissionChallenge(eventType: MissionEventType): boolean {
  return getMissionChallengeTarget(eventType) != null;
}
