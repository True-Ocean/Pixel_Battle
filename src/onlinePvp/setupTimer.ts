import { SETUP_TIME_LIMIT_SEC } from '../config/balance';

/** サーバー記録の setup_started_at から残り秒数を算出（両端末で同じ値） */
export function computeOnlineSetupSecondsRemaining(
  setupStartedAt: string | null | undefined,
  limitSec: number = SETUP_TIME_LIMIT_SEC,
): number {
  if (!setupStartedAt) return limitSec;
  const startedMs = Date.parse(setupStartedAt);
  if (Number.isNaN(startedMs)) return limitSec;
  const elapsed = Math.floor((Date.now() - startedMs) / 1000);
  return Math.max(0, limitSec - elapsed);
}
