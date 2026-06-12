import type { BattleUnit } from '../types/battle';
import { isAlive } from './battleState';

export function isStealthed(unit: BattleUnit): boolean {
  return unit.stealthActive;
}

/** 近接・両の主対象になれるか（ATTRIBUTE_SPEC §4.10） */
export function isMeleeTargetable(unit: BattleUnit): boolean {
  return isAlive(unit) && !unit.stealthActive;
}

export function shouldStartInStealth(attribute: BattleUnit['attribute']): boolean {
  return attribute === 'ninja';
}

export function breakStealth(unit: BattleUnit): void {
  unit.stealthActive = false;
}

/** 忍の初回近接は無反撃（一方的なときのみ — §4.10） */
export function shouldApplyNinjaFirstStrike(
  attacker: BattleUnit,
  bidirectional: boolean,
): boolean {
  return (
    attacker.attribute === 'ninja' &&
    !attacker.ninjaFirstStrikeUsed &&
    !bidirectional
  );
}

export function onNinjaMeleeAttack(attacker: BattleUnit): void {
  if (attacker.attribute !== 'ninja') return;
  breakStealth(attacker);
  attacker.ninjaFirstStrikeUsed = true;
}

/** 外部効果（ダメージ・回復・盾・凍結など）でステルス解除 */
export function onExternalEffectToUnit(unit: BattleUnit): void {
  breakStealth(unit);
}
