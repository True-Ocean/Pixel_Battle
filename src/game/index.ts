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
export type { ResolveTurnResult, AttackPlayback, ShieldGrants, ShieldPlayback } from './turnResult';
export { resolveTurn, promoteUnit } from './resolveTurn';
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
