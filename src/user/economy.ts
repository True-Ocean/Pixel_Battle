import type { UserEconomy } from '../types';

export function createInitialEconomy(): UserEconomy {
  return { freePixels: 0 };
}

export function normalizeUserEconomy(raw: unknown): UserEconomy {
  if (!raw || typeof raw !== 'object') return createInitialEconomy();
  const candidate = raw as Partial<UserEconomy>;
  const freePixels =
    typeof candidate.freePixels === 'number' && candidate.freePixels >= 0
      ? Math.floor(candidate.freePixels)
      : 0;
  return { freePixels };
}

export function addFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return economy;
  return { freePixels: economy.freePixels + delta };
}
