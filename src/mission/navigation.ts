import type { MissionEventType } from './types';

/** 「挑戦」タップ時の遷移先 */
export type MissionChallengeTarget =
  | { kind: 'battleHub' }
  | { kind: 'createCard' }
  | { kind: 'editCard' };

/** イベント種別に対応する遷移先。ログイン系は遷移先なし */
export function getMissionChallengeTarget(
  eventType: MissionEventType,
): MissionChallengeTarget | null {
  switch (eventType) {
    case 'battle_win':
    case 'battle_play':
      return { kind: 'battleHub' };
    case 'card_created':
      return { kind: 'createCard' };
    case 'card_edit_saved':
      return { kind: 'editCard' };
    case 'app_open':
      return null;
  }
}

export function canShowMissionChallenge(eventType: MissionEventType): boolean {
  return getMissionChallengeTarget(eventType) != null;
}
