import { describe, expect, it } from 'vitest';
import {
  canShowMissionChallenge,
  getMissionChallengeTarget,
} from '../mission/navigation';

describe('mission navigation', () => {
  it('maps event types to challenge targets', () => {
    expect(getMissionChallengeTarget('battle_win')).toEqual({ kind: 'battleHub' });
    expect(getMissionChallengeTarget('battle_play')).toEqual({ kind: 'battleHub' });
    expect(getMissionChallengeTarget('battle_log_viewed')).toEqual({ kind: 'battleHub' });
    expect(getMissionChallengeTarget('card_created')).toEqual({ kind: 'createCard' });
    expect(getMissionChallengeTarget('card_edit_saved')).toEqual({ kind: 'editCard' });
    expect(getMissionChallengeTarget('deck_reordered')).toEqual({ kind: 'deckReorder' });
    expect(getMissionChallengeTarget('attribute_battle_guide_viewed')).toEqual({
      kind: 'deckCardDetail',
    });
    expect(getMissionChallengeTarget('attribute_retouch')).toEqual({ kind: 'deckCardDetail' });
    expect(getMissionChallengeTarget('limit_break')).toEqual({ kind: 'deckCardDetail' });
    expect(getMissionChallengeTarget('history_opponent_detail_viewed')).toEqual({
      kind: 'records',
    });
    expect(getMissionChallengeTarget('history_rematch_play')).toEqual({ kind: 'records' });
    expect(getMissionChallengeTarget('app_open')).toBeNull();
  });

  it('knows whether challenge button should appear', () => {
    expect(canShowMissionChallenge('card_created')).toBe(true);
    expect(canShowMissionChallenge('app_open')).toBe(false);
  });
});
