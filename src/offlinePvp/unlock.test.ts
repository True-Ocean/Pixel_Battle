import { describe, expect, it } from 'vitest';
import {
  OFFLINE_PVP_MIN_USER_LEVEL,
  isOfflinePvpUnlockedAtUserLevel,
} from './unlock';

describe('offlinePvp unlock', () => {
  it('Lv10 未満は未解放', () => {
    expect(OFFLINE_PVP_MIN_USER_LEVEL).toBe(10);
    expect(isOfflinePvpUnlockedAtUserLevel(9)).toBe(false);
    expect(isOfflinePvpUnlockedAtUserLevel(1)).toBe(false);
  });

  it('Lv10 以上は解放', () => {
    expect(isOfflinePvpUnlockedAtUserLevel(10)).toBe(true);
    expect(isOfflinePvpUnlockedAtUserLevel(11)).toBe(true);
  });
});
