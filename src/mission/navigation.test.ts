import { describe, expect, it } from 'vitest';
import {
  canShowMissionChallenge,
  getMissionChallengeTarget,
} from '../mission/navigation';

describe('mission navigation', () => {
  it('maps event types to challenge targets', () => {
    expect(getMissionChallengeTarget('battle_win')).toEqual({ kind: 'battleHub' });
    expect(getMissionChallengeTarget('battle_play')).toEqual({ kind: 'battleHub' });
    expect(getMissionChallengeTarget('card_created')).toEqual({ kind: 'createCard' });
    expect(getMissionChallengeTarget('card_edit_saved')).toEqual({ kind: 'editCard' });
    expect(getMissionChallengeTarget('app_open')).toBeNull();
  });

  it('knows whether challenge button should appear', () => {
    expect(canShowMissionChallenge('card_created')).toBe(true);
    expect(canShowMissionChallenge('app_open')).toBe(false);
  });
});
