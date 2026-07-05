import { describe, expect, it } from 'vitest';
import { shouldReturnToOnlineDeckSelect } from './roomFlow';
import type { OnlineBattleRoom } from './types';

function room(partial: Partial<OnlineBattleRoom>): OnlineBattleRoom {
  return {
    id: 'r1',
    code: '123456',
    status: 'deck_select',
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
    lastTransferPx: null,
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

describe('shouldReturnToOnlineDeckSelect', () => {
  it('再戦開始（両デッキ未確定）では true', () => {
    expect(shouldReturnToOnlineDeckSelect(room({}))).toBe(true);
  });

  it('両デッキ確定済みでは false（setup 遷移中）', () => {
    expect(
      shouldReturnToOnlineDeckSelect(
        room({ hostDeck: [], guestDeck: [] }),
      ),
    ).toBe(false);
  });

  it('片方だけデッキがある中間状態では false', () => {
    expect(
      shouldReturnToOnlineDeckSelect(
        room({ hostDeck: [], guestDeck: null }),
      ),
    ).toBe(false);
  });

  it('デッキ変更フラグ付きでは true', () => {
    expect(
      shouldReturnToOnlineDeckSelect(
        room({ hostDeck: null, guestDeck: [], hostDeckChange: true }),
      ),
    ).toBe(true);
  });

  it('setup 中は false', () => {
    expect(shouldReturnToOnlineDeckSelect(room({ status: 'setup' }))).toBe(
      false,
    );
  });
});
