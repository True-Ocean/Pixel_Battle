import { DAZZLE_BP_RATIO } from '../config/balance';
import type { BattleUnit } from '../types/battle';
import { isAlive } from './battleState';
import { onExternalEffectToUnit } from './ninjaCombat';

export function isDazzled(unit: BattleUnit): boolean {
  return isAlive(unit) && unit.dazzledUntilTurn != null;
}

/**
 * 目眩付与（ATTRIBUTE_SPEC §5.5）。
 * displayTurn は getDisplayTurn(state)（付与時点）。
 * 有効期限は displayTurn+1 まで（翌ターンの癒で解除可、その次のターン開始で自然解除）。
 */
export function applyDazzle(unit: BattleUnit, displayTurn: number): boolean {
  if (!isAlive(unit)) return false;
  onExternalEffectToUnit(unit);
  if (unit.dazzledUntilTurn != null) {
    unit.dazzledUntilTurn = displayTurn + 1;
    return false;
  }
  unit.currentBp = Math.max(1, Math.round(unit.currentBp * DAZZLE_BP_RATIO));
  unit.maxBp = Math.max(1, Math.round(unit.maxBp * DAZZLE_BP_RATIO));
  unit.dazzledUntilTurn = displayTurn + 1;
  return true;
}

/** 目眩解除時の BP 復元（÷ DAZZLE_BP_RATIO） */
export function clearDazzle(unit: BattleUnit): boolean {
  if (unit.dazzledUntilTurn == null) return false;
  unit.dazzledUntilTurn = null;
  if (!isAlive(unit)) return true;
  const restoredMax = Math.max(1, Math.round(unit.maxBp / DAZZLE_BP_RATIO));
  const restoredCurrent = Math.max(
    1,
    Math.min(restoredMax, Math.round(unit.currentBp / DAZZLE_BP_RATIO)),
  );
  unit.maxBp = restoredMax;
  unit.currentBp = restoredCurrent;
  return true;
}

export function expireDazzle(field: BattleUnit[], displayTurn: number): void {
  for (const unit of field) {
    if (unit.dazzledUntilTurn != null && displayTurn > unit.dazzledUntilTurn) {
      clearDazzle(unit);
    }
  }
}
