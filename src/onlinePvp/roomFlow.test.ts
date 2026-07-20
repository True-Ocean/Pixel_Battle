import { describe, expect, it } from 'vitest';
import {
  shouldApplyOnlineRoomUpdate,
  shouldReturnToOnlineDeckSelect,
} from './roomFlow';
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
    hostPhaseTimerReady: false,
    guestPhaseTimerReady: false,
    phaseTimerStartedAt: null,
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

describe('shouldApplyOnlineRoomUpdate', () => {
  it('battle 中は古い battle_revision を拒否する', () => {
    const current = room({
      status: 'battle',
      battleRevision: 5,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const stale = room({
      status: 'battle',
      battleRevision: 3,
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    expect(shouldApplyOnlineRoomUpdate(current, stale)).toBe(false);
  });

  it('同 revision の新しい updatedAt は許可する', () => {
    const current = room({
      status: 'battle',
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const next = room({
      status: 'battle',
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:01.000Z',
      hostPendingAction: {
        type: 'pass',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    });
    expect(shouldApplyOnlineRoomUpdate(current, next)).toBe(true);
  });

  it('battle_state が消えた更新は拒否する', () => {
    const current = room({
      status: 'battle',
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      battleState: {
        player: [],
        cpu: [],
        turn: 1,
        log: [],
        events: [],
      },
    });
    const wiped = room({
      status: 'battle',
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:02.000Z',
      battleState: null,
    });
    expect(shouldApplyOnlineRoomUpdate(current, wiped)).toBe(false);
  });

  it('status 変化は適用する', () => {
    const current = room({ status: 'battle', battleRevision: 5 });
    const next = room({ status: 'rematch_wait', battleRevision: 5 });
    expect(shouldApplyOnlineRoomUpdate(current, next)).toBe(true);
  });

  it('status 欠落の不完全な更新は拒否する', () => {
    const current = room({
      status: 'battle',
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      battleState: {
        player: [],
        cpu: [],
        turn: 3,
        log: [],
        events: [],
      },
    });
    const incomplete = room({
      status: '' as OnlineBattleRoom['status'],
      battleRevision: 2,
      updatedAt: '2026-01-02T00:00:03.000Z',
      battleState: null,
    });
    expect(shouldApplyOnlineRoomUpdate(current, incomplete)).toBe(false);
  });
});
