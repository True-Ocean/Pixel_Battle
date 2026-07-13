import type { BattleState } from '../types/battle';
import type {
  AttackPlayback,
  HealPlayback,
  IlluminatePlayback,
  ShieldPlayback,
} from '../game/turnResult';

export interface BattlePlayback {
  attacks: AttackPlayback[];
  shields: ShieldPlayback[];
  heals: HealPlayback[];
  illuminates: IlluminatePlayback[];
  shieldState: BattleState;
  stateAfterHeals: BattleState;
  stateAfterIlluminates: BattleState;
  pendingNext: BattleState;
  attackIndex: number;
  attackSubPhase: 'damage' | 'bp';
  healSubPhase: 'damage' | 'bp';
  phase: 'heal' | 'illuminate' | 'shield' | 'attack' | 'done';
}
