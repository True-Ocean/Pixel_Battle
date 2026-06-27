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
    case 'battle_play':
    case 'battle_log_viewed':
      return { kind: 'battleHub' };
    case 'card_created':
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
      return { kind: 'records' };
    case 'app_open':
      return null;
  }
}

export function canShowMissionChallenge(eventType: MissionEventType): boolean {
  return getMissionChallengeTarget(eventType) != null;
}
