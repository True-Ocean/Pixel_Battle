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

export function spendFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy | null {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return economy;
  if (economy.freePixels < cost) return null;
  return { freePixels: economy.freePixels - cost };
}

export function setFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const next =
    typeof amount === 'number' && Number.isFinite(amount)
      ? Math.floor(amount)
      : 0;
  return { freePixels: Math.max(0, next) };
}
