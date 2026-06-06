import type { BattleState } from '../types/battle';
import type { ShieldGrants } from '../game/resolveTurn';

/** enter: スロット→中央 / impact+hp: 中央で戦闘 / exit: 中央→スロット */
export type ClashAnimPhase = 'enter' | 'impact' | 'hp' | 'exit';

export interface ClashPlayback {
  playerMain: number;
  cpuMain: number;
  phase: ClashAnimPhase;
  pendingNext: BattleState;
  /** このターンの防御で付与された盾（戦闘消費前） */
  shieldGrants: ShieldGrants;
  hpFromPlayer: number;
  hpFromCpu: number;
  hpToPlayer: number;
  hpToCpu: number;
}

export const CLASH_MS = {
  enter: 450,
  impact: 320,
  damage: 420,
  hp: 520,
  exit: 450,
} as const;

/** 中央衝突時に重ねる高さ（px）。カードの一部だけが重なる量 */
export const CLASH_OVERLAP_PX = 24;
