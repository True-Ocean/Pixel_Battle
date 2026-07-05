import type { BattleUnit } from '../types/battle';
import { isAlive } from '../game/battleState';
import {
  ONLINE_PVP_MIN_WALLET_PX,
  ONLINE_PVP_PX_PER_SURVIVOR,
} from './constants';

/** フィールド上の生存ユニット数（BP > 0） */
export function countFieldSurvivors(units: BattleUnit[]): number {
  return units.filter((u) => isAlive(u)).length;
}

/** 1 戦の px 移動量（20 × 勝者生存枚数、1〜5） */
export function calcOnlinePvpBattleTransfer(winnerSurvivorCount: number): number {
  const clamped = Math.max(1, Math.min(5, Math.floor(winnerSurvivorCount)));
  return clamped * ONLINE_PVP_PX_PER_SURVIVOR;
}

export function canContinueOnlinePvpSession(walletPx: number): boolean {
  return walletPx >= ONLINE_PVP_MIN_WALLET_PX;
}

/** 敗者の手持ち px を上限に実際に移動する px を決める */
export function clampOnlinePvpWalletTransfer(
  desired: number,
  loserWalletPx: number,
): number {
  return Math.min(Math.max(0, desired), Math.max(0, loserWalletPx));
}

/** @deprecated clampOnlinePvpWalletTransfer を使用 */
export function clampTransferAmount(
  desired: number,
  _winnerBalance: number,
  loserBalance: number,
): number {
  return clampOnlinePvpWalletTransfer(desired, loserBalance);
}

/** バトル結果に基づき手持ち px を増減（ゼロサム） */
export function applyOnlinePvpWalletTransfer(
  walletPx: number,
  playerWon: boolean,
  transfer: number,
): { nextWalletPx: number; applied: number } {
  if (transfer <= 0) {
    return { nextWalletPx: walletPx, applied: 0 };
  }
  if (playerWon) {
    return { nextWalletPx: walletPx + transfer, applied: transfer };
  }
  const applied = clampOnlinePvpWalletTransfer(transfer, walletPx);
  return { nextWalletPx: walletPx - applied, applied };
}
