import { ONLINE_PVP_MIN_USER_LEVEL } from './constants';

export { ONLINE_PVP_MIN_USER_LEVEL };

export function isOnlinePvpUnlockedAtUserLevel(userLevel: number): boolean {
  return Math.floor(userLevel) >= ONLINE_PVP_MIN_USER_LEVEL;
}
