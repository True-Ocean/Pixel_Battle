import { computeCardPower, computeDeckPower } from '../card';
import type { Card } from '../types';
import type { BattleUnit } from '../types/battle';

/** 平均戦力との相対差がこの値以下なら補正しない */
export const ONLINE_PVP_POWER_BALANCE_THRESHOLD = 0.1;

/** デッキ BP を targetPower に近づける（属性・絵・レア等は維持） */
export function scaleDeckToTargetPower(
  deck: readonly Card[],
  targetPower: number,
): Card[] {
  const cloned = structuredClone(deck) as Card[];
  const currentPower = computeDeckPower(cloned);
  if (currentPower <= 0 || targetPower <= 0 || currentPower === targetPower) {
    return cloned;
  }

  const ratio = targetPower / currentPower;
  return cloned.map((card) => ({
    ...card,
    bp: Math.max(1, Math.round(card.bp * ratio)),
  }));
}

export function onlinePowerBalanceRelativeGap(
  hostPower: number,
  guestPower: number,
): number {
  if (hostPower <= 0 || guestPower <= 0) return 0;
  const average = (hostPower + guestPower) / 2;
  if (average <= 0) return 0;
  return Math.abs(hostPower - guestPower) / average;
}

export function shouldApplyOnlinePowerBalance(
  hostPower: number,
  guestPower: number,
): boolean {
  return (
    onlinePowerBalanceRelativeGap(hostPower, guestPower) >
    ONLINE_PVP_POWER_BALANCE_THRESHOLD
  );
}

export interface OnlineDeckPowerBalanceResult {
  hostDeck: Card[];
  guestDeck: Card[];
  applied: boolean;
  targetPower: number;
}

/** オンライン対人: 両デッキを平均戦力へ BP 比率スケール（10% 以内はスキップ） */
export function balanceOnlineDecksForBattle(
  hostDeck: readonly Card[],
  guestDeck: readonly Card[],
): OnlineDeckPowerBalanceResult {
  const hostPower = computeDeckPower(hostDeck);
  const guestPower = computeDeckPower(guestDeck);

  if (!shouldApplyOnlinePowerBalance(hostPower, guestPower)) {
    return {
      hostDeck: structuredClone(hostDeck) as Card[],
      guestDeck: structuredClone(guestDeck) as Card[],
      applied: false,
      targetPower: 0,
    };
  }

  const targetPower = Math.round((hostPower + guestPower) / 2);
  return {
    hostDeck: scaleDeckToTargetPower(hostDeck, targetPower),
    guestDeck: scaleDeckToTargetPower(guestDeck, targetPower),
    applied: true,
    targetPower,
  };
}

/** バトル中バナー用: フィールド上ユニットの現在 BP から戦力合計 */
export function computeFieldPowerFromUnits(
  units: readonly BattleUnit[],
): number {
  return units.reduce(
    (sum, unit) =>
      sum +
      computeCardPower({
        attribute: unit.attribute,
        bp: unit.currentBp,
        rarity: unit.rarity,
      }),
    0,
  );
}
