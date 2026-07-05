import { describe, expect, it } from 'vitest';
import { isOnlinePvpUnlockedAtUserLevel, ONLINE_PVP_MIN_USER_LEVEL } from './unlock';

describe('onlinePvp unlock', () => {
  it('requires Lv10', () => {
    expect(isOnlinePvpUnlockedAtUserLevel(ONLINE_PVP_MIN_USER_LEVEL - 1)).toBe(false);
    expect(isOnlinePvpUnlockedAtUserLevel(ONLINE_PVP_MIN_USER_LEVEL)).toBe(true);
  });
});
