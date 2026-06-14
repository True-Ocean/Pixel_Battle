import type { UserEconomy } from '../types';

export function createInitialEconomy(): UserEconomy {
  return { freePixels: 0, jewels: 0 };
}

export function normalizeUserEconomy(raw: unknown): UserEconomy {
  if (!raw || typeof raw !== 'object') return createInitialEconomy();
  const candidate = raw as Partial<UserEconomy>;
  const freePixels =
    typeof candidate.freePixels === 'number' && candidate.freePixels >= 0
      ? Math.floor(candidate.freePixels)
      : 0;
  const jewels =
    typeof candidate.jewels === 'number' && candidate.jewels >= 0
      ? Math.floor(candidate.jewels)
      : 0;
  return { freePixels, jewels };
}

export function addFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return economy;
  return { ...economy, freePixels: economy.freePixels + delta };
}

export function spendFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy | null {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return economy;
  if (economy.freePixels < cost) return null;
  return { ...economy, freePixels: economy.freePixels - cost };
}

export function setFreePixels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const next =
    typeof amount === 'number' && Number.isFinite(amount)
      ? Math.floor(amount)
      : 0;
  return { ...economy, freePixels: Math.max(0, next) };
}

export function addJewels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return economy;
  return { ...economy, jewels: economy.jewels + delta };
}

export function spendJewels(
  economy: UserEconomy,
  amount: number,
): UserEconomy | null {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return economy;
  if (economy.jewels < cost) return null;
  return { ...economy, jewels: economy.jewels - cost };
}

export function setJewels(
  economy: UserEconomy,
  amount: number,
): UserEconomy {
  const next =
    typeof amount === 'number' && Number.isFinite(amount)
      ? Math.floor(amount)
      : 0;
  return { ...economy, jewels: Math.max(0, next) };
}
