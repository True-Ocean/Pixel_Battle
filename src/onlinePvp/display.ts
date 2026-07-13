import type { OnlineBattleRoom, OnlineBattleRole } from './types';

export interface OnlinePxBalanceSnapshot {
  myPrevious: number;
  myNext: number;
  transfer: number;
  /** 勝者なら true（表示の符号に使う） */
  playerWon: boolean;
}

/** バトル終了後の px 増減表示用（手持ち px ベース） */
export function buildOnlinePxBalanceSnapshot(
  myWalletAfter: number,
  playerWon: boolean,
  transfer: number,
): OnlinePxBalanceSnapshot {
  const applied = Math.max(0, transfer);
  const myPrevious = playerWon
    ? myWalletAfter - applied
    : myWalletAfter + applied;
  return {
    myPrevious,
    myNext: myWalletAfter,
    transfer: applied,
    playerWon,
  };
}

/** 再戦待ちモーダルのメインボタン文言 */
export function onlineRematchButtonLabel(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): string {
  if (room.status === 'closed') return '再戦希望';
  if (room.status !== 'rematch_wait' && room.status !== 'battle') {
    return '再戦希望';
  }
  const myReady =
    role === 'host' ? room.hostRematchReady : room.guestRematchReady;
  const oppReady =
    role === 'host' ? room.guestRematchReady : room.hostRematchReady;
  if (oppReady && !myReady) return '再戦に応じる';
  return '再戦希望';
}

/** 再戦待ち / 退出時の案内文 */
export function onlineRematchHint(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): string | undefined {
  const myReady =
    role === 'host' ? room.hostRematchReady : room.guestRematchReady;

  if (room.status === 'closed') {
    if (room.closedByRole && room.closedByRole !== role) {
      if (myReady) {
        return '再戦の返答を待っている間に相手が退出しました';
      }
      return '相手が退出しました';
    }
    return undefined;
  }

  if (room.status !== 'rematch_wait' && room.status !== 'battle') {
    return undefined;
  }

  const oppReady =
    role === 'host' ? room.guestRematchReady : room.hostRematchReady;
  if (oppReady && !myReady) {
    return '相手が再戦を希望しています';
  }
  if (myReady && !oppReady) {
    return '相手の返答を待っています…';
  }
  return undefined;
}

/** 続戦不可時のヒント */
export function onlineRematchInsufficientPxHint(canRematch: boolean): string | undefined {
  if (canRematch) return undefined;
  return '手持ち px が不足しているため、再戦できません。';
}
