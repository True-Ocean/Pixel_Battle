export {
  createBattleState,
  cardToBattleUnit,
  getBattleResult,
  getAliveIndices,
  isAlive,
  appendLog,
  canGrantDefenseShields,
  BOARD_POSITIONS,
  FRONT_POSITIONS,
  BACK_POSITIONS,
  getUnitAt,
  getUnitIndexAt,
  getDefeated,
  getShieldTargets,
  getShieldTargetsForActor,
  getMeleeTargets,
  getBowTargets,
  getDualTargets,
  getActionTypesForUnit,
  getPromotableBackPositions,
  getPendingPromotionFronts,
  getEmptyFrontPositions,
} from './battleState';
export { compareActionOrder, ATTRIBUTE_PRIORITY } from '../config/attributePriority';
export type {
  ResolveTurnResult,
  AttackPlayback,
  HealPlayback,
  PoisonDoTPlayback,
  ShieldGrants,
  ShieldPlayback,
} from './turnResult';
export {
  canReceiveHeal,
  canUseHealAction,
  calcHealAmount,
  getHealTargets,
} from './healCombat';
export {
  applyFreeze,
  expireFreeze,
  getSelectionTurn,
  isFrozen,
} from './iceCombat';
export {
  calcStormDamage,
  canUseStormAction,
  getStormTargetableUnits,
  isStormTargetable,
  pickStormTargets,
} from './stormCombat';
export {
  breakStealth,
  isMeleeTargetable,
  isStealthed,
  onExternalEffectToUnit,
  onNinjaMeleeAttack,
  shouldApplyNinjaFirstStrike,
  shouldStartInStealth,
} from './ninjaCombat';
export { resolveTurn, promoteUnit } from './resolveTurn';
export { startNextTurn } from './startNextTurn';
export type { StartTurnResult } from './startNextTurn';
export {
  enumerateBattleActionChoices,
  hasBattleActionChoices,
  pickPassAction,
} from './actionChoices';
export { pickCpuMainIndex, pickCpuAction, autoPromoteCpu } from './cpu';
export {
  buildCpuStarterCards,
  buildCpuFullDeck,
  buildBalancedCpuDeck,
  buildRandomCpuDeck,
  buildDeckTargets,
  rollCpuDifficulty,
  pickCpuBattleLineup,
  randomCpuName,
  STRONG_ENEMY_CHANCE,
} from './cpuDeck';
export { CPU_PATTERNS, pickCpuPattern } from './cpuPatterns';
