import type { Card } from '../types';
import type { BattleState, BoardPosition } from '../types/battle';
import {
  BOARD_POSITIONS,
  createBattleState,
} from '../game/battleState';
import { cardToBattleUnit } from '../game/battleState';
import type { OnlineBattleFormation, OnlineBattleRole } from './types';

export function cardsToFormation(
  formation: Record<BoardPosition, Card | null>,
): OnlineBattleFormation {
  return BOARD_POSITIONS.reduce((acc, pos) => {
    acc[pos] = formation[pos]?.id ?? null;
    return acc;
  }, {} as OnlineBattleFormation);
}

export function formationToSlots(
  formation: OnlineBattleFormation,
  deck: Card[],
): Record<BoardPosition, Card | null> {
  const byId = new Map(deck.map((c) => [c.id, c]));
  return BOARD_POSITIONS.reduce(
    (acc, pos) => {
      const id = formation[pos];
      acc[pos] = id ? (byId.get(id) ?? null) : null;
      return acc;
    },
    {} as Record<BoardPosition, Card | null>,
  );
}

/** ホスト視点（host=player, guest=cpu）でバトル状態を生成 */
export function createOnlineBattleState(
  hostFormation: Record<BoardPosition, Card | null>,
  guestFormation: Record<BoardPosition, Card | null>,
): BattleState {
  const player = BOARD_POSITIONS.map((pos) => {
    const card = hostFormation[pos];
    return card ? cardToBattleUnit(card, pos) : null;
  }).filter((u): u is NonNullable<typeof u> => u != null);
  const cpu = BOARD_POSITIONS.map((pos) => {
    const card = guestFormation[pos];
    return card ? cardToBattleUnit(card, pos) : null;
  }).filter((u): u is NonNullable<typeof u> => u != null);
  if (player.length !== 5 || cpu.length !== 5) {
    return createBattleState([], []);
  }
  return {
    player,
    cpu,
    turn: 0,
    log: ['戦闘開始'],
    events: [],
  };
}

/** ゲスト端末向けに host 視点 state を反転（2回適用で元に戻る） */
export function flipBattleStateForGuest(state: BattleState): BattleState {
  return {
    ...state,
    player: state.cpu.map((u) => ({ ...u })),
    cpu: state.player.map((u) => ({ ...u })),
    log: [...state.log],
    events: [...state.events],
  };
}

/** DB 上の host 視点 battle_state をローカル視点へ */
export function toLocalBattleState(
  remoteHost: BattleState,
  role: OnlineBattleRole,
): BattleState {
  return role === 'guest' ? flipBattleStateForGuest(remoteHost) : remoteHost;
}

/** ローカル視点 state を DB 用 host 視点へ */
export function toHostBattleState(
  state: BattleState,
  role: OnlineBattleRole,
): BattleState {
  return role === 'host' ? state : flipBattleStateForGuest(state);
}

export function flipWinnerForGuest(
  winner: 'player' | 'cpu',
): 'player' | 'cpu' {
  return winner === 'player' ? 'cpu' : 'player';
}

export function mapWinnerRole(
  state: BattleState,
): 'player' | 'cpu' | null {
  const playerAlive = state.player.some(
    (u) => u.currentBp > 0 && u.position !== 'defeated',
  );
  const cpuAlive = state.cpu.some(
    (u) => u.currentBp > 0 && u.position !== 'defeated',
  );
  if (playerAlive && !cpuAlive) return 'player';
  if (!playerAlive && cpuAlive) return 'cpu';
  if (!playerAlive && !cpuAlive) return 'cpu';
  return null;
}

export function winnerRoleFromSide(
  side: 'player' | 'cpu',
  perspective: OnlineBattleRole,
): OnlineBattleRole {
  if (perspective === 'host') {
    return side === 'player' ? 'host' : 'guest';
  }
  return side === 'player' ? 'guest' : 'host';
}
