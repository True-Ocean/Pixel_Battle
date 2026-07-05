import type { OnlineBattleRoom, OnlineBattleRole } from './types';

export interface OnlinePxBalanceSnapshot {
  myPrevious: number;
  myNext: number;
  transfer: number;
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
  };
}

/** 再戦待ちモーダルのメインボタン文言 */
export function onlineRematchButtonLabel(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): string {
  if (room.status !== 'rematch_wait') return '再戦希望';
  const myReady =
    role === 'host' ? room.hostRematchReady : room.guestRematchReady;
  const oppReady =
    role === 'host' ? room.guestRematchReady : room.hostRematchReady;
  if (oppReady && !myReady) return '再戦に応じる';
  return '再戦希望';
}

/** 再戦待ちフェーズの中央ヒント */
export function onlineRematchHint(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): string | undefined {
  if (room.status === 'closed') {
    if (room.closedByRole && room.closedByRole !== role) {
      return '相手が退出しました';
    }
    return undefined;
  }
  if (room.status !== 'rematch_wait') return undefined;
  const myReady =
    role === 'host' ? room.hostRematchReady : room.guestRematchReady;
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
