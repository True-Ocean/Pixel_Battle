import type { BattleState } from '../types/battle';
import type { ShieldGrants } from '../game/resolveTurn';

/** enter: スロット→中央 / impact+bp: 中央で戦闘 / exit: 中央→スロット */
export type ClashAnimPhase = 'enter' | 'impact' | 'bp' | 'exit';

export interface ClashPlayback {
  playerMain: number;
  cpuMain: number;
  phase: ClashAnimPhase;
  pendingNext: BattleState;
  /** このターンの防御で付与された盾（戦闘消費前） */
  shieldGrants: ShieldGrants;
  bpFromPlayer: number;
  bpFromCpu: number;
  bpToPlayer: number;
  bpToCpu: number;
}

export const CLASH_MS = {
  enter: 450,
  impact: 320,
  damage: 420,
  bp: 520,
  exit: 450,
} as const;

/** 中央衝突時に重ねる高さ（px）。カードの一部だけが重なる量 */
export const CLASH_OVERLAP_PX = 24;
