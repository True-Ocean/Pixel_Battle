import { describe, expect, it } from 'vitest';
import {
  buildOnlinePxBalanceSnapshot,
  onlineRematchButtonLabel,
  onlineRematchHint,
  onlineRematchInsufficientPxHint,
} from './display';
import type { OnlineBattleRoom } from './types';

function room(partial: Partial<OnlineBattleRoom>): OnlineBattleRoom {
  return {
    id: 'r1',
    code: '123456',
    status: 'rematch_wait',
    hostUserId: 'h',
    guestUserId: 'g',
    hostName: 'H',
    guestName: 'G',
    hostLevel: 10,
    guestLevel: 11,
    hostBalance: 0,
    guestBalance: 0,
    hostDeck: null,
    guestDeck: null,
    hostFormation: null,
    guestFormation: null,
    hostSetupReady: false,
    guestSetupReady: false,
    battleState: null,
    hostPendingAction: null,
    guestPendingAction: null,
    hostRematchReady: false,
    guestRematchReady: false,
    hostDeckChange: false,
    guestDeckChange: false,
    disconnectUserId: null,
    disconnectDeadline: null,
    lastTransferPx: 60,
    expiresAt: '',
    updatedAt: '',
    setupStartedAt: null,
    closedByRole: null,
    battleRevision: 0,
    battlePhase: 'select',
    lastClash: null,
    powerBalanceApplied: false,
    ...partial,
  };
}

describe('onlinePvp display', () => {
  it('buildOnlinePxBalanceSnapshot は手持ち px から増減を復元する', () => {
    expect(buildOnlinePxBalanceSnapshot(160, true, 60)).toEqual({
      myPrevious: 100,
      myNext: 160,
      transfer: 60,
      playerWon: true,
    });
    expect(buildOnlinePxBalanceSnapshot(40, false, 60)).toEqual({
      myPrevious: 100,
      myNext: 40,
      transfer: 60,
      playerWon: false,
    });
  });

  it('onlineRematchButtonLabel は相手のみ ready のとき応答ボタンを返す', () => {
    expect(
      onlineRematchButtonLabel(
        room({ hostRematchReady: true, guestRematchReady: false }),
        'guest',
      ),
    ).toBe('再戦に応じる');
    expect(
      onlineRematchButtonLabel(
        room({ hostRematchReady: false, guestRematchReady: true }),
        'host',
      ),
    ).toBe('再戦に応じる');
    expect(
      onlineRematchButtonLabel(
        room({ hostRematchReady: false, guestRematchReady: false }),
        'host',
      ),
    ).toBe('再戦希望');
  });

  it('onlineRematchHint は相手のみ ready のとき再戦申込を表示', () => {
    expect(
      onlineRematchHint(
        room({ hostRematchReady: true, guestRematchReady: false }),
        'guest',
      ),
    ).toBe('相手が再戦を希望しています');
    expect(
      onlineRematchHint(
        room({ hostRematchReady: false, guestRematchReady: true }),
        'host',
      ),
    ).toBe('相手が再戦を希望しています');
  });

  it('onlineRematchHint は自端末 ready 後に待機表示', () => {
    expect(
      onlineRematchHint(
        room({ hostRematchReady: true, guestRematchReady: false }),
        'host',
      ),
    ).toBe('相手の返答を待っています…');
  });

  it('onlineRematchHint は相手退出時にメッセージを返す', () => {
    expect(
      onlineRematchHint(
        room({ status: 'closed', closedByRole: 'guest' }),
        'host',
      ),
    ).toBe('相手が退出しました');
    expect(
      onlineRematchHint(
        room({ status: 'closed', closedByRole: 'host' }),
        'host',
      ),
    ).toBeUndefined();
    expect(
      onlineRematchHint(
        room({
          status: 'closed',
          closedByRole: 'guest',
          hostRematchReady: true,
        }),
        'host',
      ),
    ).toBe('再戦の返答を待っている間に相手が退出しました');
  });

  it('onlineRematchInsufficientPxHint', () => {
    expect(onlineRematchInsufficientPxHint(true)).toBeUndefined();
    expect(onlineRematchInsufficientPxHint(false)).toContain('不足');
  });
});
