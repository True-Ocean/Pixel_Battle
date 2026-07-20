import {
  ONLINE_PVP_PROMOTION_TIME_LIMIT_SEC,
  ONLINE_PVP_SELECT_TIME_LIMIT_SEC,
  ONLINE_PVP_TIMER_DISPLAY_THRESHOLD_SEC,
  ONLINE_PVP_TIMER_URGENT_THRESHOLD_SEC,
} from './constants';
import type { OnlineBattlePhase } from './types';

/** サーバー記録の phase_timer_started_at から残り秒数を算出（両端末で同じ値） */
export function computeOnlinePhaseSecondsRemaining(
  phaseTimerStartedAt: string | null | undefined,
  limitSec: number,
): number | null {
  if (!phaseTimerStartedAt) return null;
  const startedMs = Date.parse(phaseTimerStartedAt);
  if (Number.isNaN(startedMs)) return null;
  const elapsed = Math.floor((Date.now() - startedMs) / 1000);
  return Math.max(0, limitSec - elapsed);
}

export function onlinePhaseTimeLimitSec(
  battlePhase: OnlineBattlePhase | undefined,
): number | null {
  if (battlePhase === 'select') return ONLINE_PVP_SELECT_TIME_LIMIT_SEC;
  if (battlePhase === 'promotion') return ONLINE_PVP_PROMOTION_TIME_LIMIT_SEC;
  return null;
}

export function shouldShowOnlinePhaseTimer(
  remaining: number | null,
  thresholdSec: number = ONLINE_PVP_TIMER_DISPLAY_THRESHOLD_SEC,
): boolean {
  return remaining != null && remaining > 0 && remaining <= thresholdSec;
}

export function isOnlinePhaseTimerUrgent(
  remaining: number | null,
  thresholdSec: number = ONLINE_PVP_TIMER_URGENT_THRESHOLD_SEC,
): boolean {
  return remaining != null && remaining > 0 && remaining < thresholdSec;
}

export type OnlinePhaseTimerZone = 'player' | 'cpu';

export interface OnlinePhaseTimerDisplay {
  zone: OnlinePhaseTimerZone | null;
  seconds: number | null;
  urgent: boolean;
}

export function deriveOnlinePhaseTimerDisplay(input: {
  phaseTimerStartedAt: string | null;
  battlePhase: OnlineBattlePhase | undefined;
  inReplay: boolean;
  waitingForOpponent: boolean;
  needsOwnPromotion: boolean;
  waitingOpponentPromotion: boolean;
}): OnlinePhaseTimerDisplay {
  const idle: OnlinePhaseTimerDisplay = {
    zone: null,
    seconds: null,
    urgent: false,
  };
  if (input.inReplay) return idle;

  const limitSec = onlinePhaseTimeLimitSec(input.battlePhase);
  if (limitSec == null) return idle;

  const remaining = computeOnlinePhaseSecondsRemaining(
    input.phaseTimerStartedAt,
    limitSec,
  );
  if (!shouldShowOnlinePhaseTimer(remaining)) return idle;

  let zone: OnlinePhaseTimerZone | null = null;
  if (input.battlePhase === 'select') {
    zone = input.waitingForOpponent ? 'cpu' : 'player';
  } else if (input.battlePhase === 'promotion') {
    if (input.waitingOpponentPromotion) {
      zone = 'cpu';
    } else if (input.needsOwnPromotion) {
      zone = 'player';
    }
  }

  if (zone == null) return idle;

  return {
    zone,
    seconds: remaining,
    urgent: isOnlinePhaseTimerUrgent(remaining),
  };
}
