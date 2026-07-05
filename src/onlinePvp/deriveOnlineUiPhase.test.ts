import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from '../canvas';
import { createCardFromDrawing } from '../card';
import type { Attribute, Card } from '../types';
import { createBattleState, getPendingPromotionFronts } from '../game/battleState';
import { buildOnlineBattleSessionView } from '../components/useOnlineBattleSession';
import { flipBattleStateForGuest } from './battleSync';
import {
  computeOnlineWaitingForOpponent,
  deriveOnlineUiPhase,
  isOnlineUiInputLocked,
} from './deriveOnlineUiPhase';
import { mapOnlineBattleRoom, type OnlineBattleRoomRow } from './types';

function stubCard(name: string, attr: Attribute, bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

function battleRoom(
  battleState: ReturnType<typeof createBattleState>,
  partial: Partial<OnlineBattleRoomRow> = {},
) {
  return mapOnlineBattleRoom({
    id: 'room-1',
    code: '123456',
    host_user_id: 'host-user',
    guest_user_id: 'guest-user',
    host_name: 'Host',
    guest_name: 'Guest',
    host_level: 10,
    guest_level: 10,
    status: 'battle',
    host_balance: 100,
    guest_balance: 100,
    host_deck: null,
    guest_deck: null,
    host_formation: null,
    guest_formation: null,
    host_setup_ready: true,
    guest_setup_ready: true,
    battle_state: battleState,
    host_pending_action: null,
    guest_pending_action: null,
    host_rematch_ready: false,
    guest_rematch_ready: false,
    host_deck_change: false,
    guest_deck_change: false,
    disconnect_user_id: null,
    disconnect_deadline: null,
    last_transfer_px: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    setup_started_at: null,
    closed_by_role: null,
    battle_revision: 1,
    battle_phase: 'select',
    last_clash: null,
    power_balance_applied: false,
    ...partial,
  });
}

function stateWithEmptyFront(): ReturnType<typeof createBattleState> {
  const cards = [
    stubCard('Ninja', 'attack', 21),
    stubCard('EmptyFront', 'attack', 22),
    stubCard('Fire', 'attack', 72),
    stubCard('BackA', 'attack', 50),
    stubCard('BackB', 'attack', 40),
  ];
  let state = createBattleState(cards, cards);
  state = {
    ...state,
    player: state.player.map((u, i) =>
      i === 1 ? { ...u, position: 'defeated' as const, currentBp: 0 } : u,
    ),
    cpu: state.cpu.map((u, i) =>
      i === 1 ? { ...u, position: 'defeated' as const, currentBp: 0 } : u,
    ),
  };
  return state;
}

describe('deriveOnlineUiPhase', () => {
  it('select + 昇格必要（DB phase=select）→ promoteUnit を優先し pickMain にしない', () => {
    const hostState = stateWithEmptyFront();
    expect(getPendingPromotionFronts(hostState.player).length).toBeGreaterThan(0);

    const room = battleRoom(hostState, { battle_phase: 'select' });
    const phase = deriveOnlineUiPhase({
      room,
      localState: hostState,
      promotionDraft: { from: null },
      replayOverlay: null,
      waitingForOpponent: false,
    });

    expect(phase).toBe('promoteUnit');
    expect(phase).not.toBe('pickMain');
  });

  it('昇格不要 + select → pickMain', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      stubCard(`C${i}`, 'attack', 50 + i),
    );
    const state = createBattleState(cards, cards);
    const room = battleRoom(state, { battle_phase: 'select' });

    expect(
      deriveOnlineUiPhase({
        room,
        localState: state,
        promotionDraft: { from: null },
        replayOverlay: null,
        waitingForOpponent: false,
      }),
    ).toBe('pickMain');
  });

  it('replay overlay は昇格より優先', () => {
    const hostState = stateWithEmptyFront();
    const room = battleRoom(hostState, { battle_phase: 'promotion' });

    expect(
      deriveOnlineUiPhase({
        room,
        localState: hostState,
        promotionDraft: { from: null },
        replayOverlay: { kind: 'clash' },
        waitingForOpponent: false,
      }),
    ).toBe('clashReplay');
  });

  it('自分の昇格完了・相手未完了 → waitOpponentPromotion', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      stubCard(`C${i}`, 'attack', 50 + i),
    );
    let hostState = createBattleState(cards, cards);
    hostState = {
      ...hostState,
      cpu: hostState.cpu.map((u, i) =>
        i === 0 ? { ...u, position: 'defeated' as const, currentBp: 0 } : u,
      ),
    };
    const room = battleRoom(hostState, { battle_phase: 'promotion' });

    expect(
      deriveOnlineUiPhase({
        room,
        localState: hostState,
        promotionDraft: { from: null },
        replayOverlay: null,
        waitingForOpponent: false,
      }),
    ).toBe('waitOpponentPromotion');
  });

  it('guest flip 後も host と同じ昇格 UI（promoteUnit）', () => {
    const hostState = stateWithEmptyFront();
    const guestLocal = flipBattleStateForGuest(hostState);
    const room = battleRoom(hostState, { battle_phase: 'select' });

    const hostPhase = deriveOnlineUiPhase({
      room,
      localState: hostState,
      promotionDraft: { from: null },
      replayOverlay: null,
      waitingForOpponent: false,
    });
    const guestPhase = deriveOnlineUiPhase({
      room,
      localState: guestLocal,
      promotionDraft: { from: null },
      replayOverlay: null,
      waitingForOpponent: false,
    });

    expect(hostPhase).toBe('promoteUnit');
    expect(guestPhase).toBe('promoteUnit');
  });

  it('actionPickSubPhase で pickTarget / pickShield / pickHeal を導出', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      stubCard(`C${i}`, 'attack', 50 + i),
    );
    const state = createBattleState(cards, cards);
    const room = battleRoom(state, { battle_phase: 'select' });
    const base = {
      room,
      localState: state,
      promotionDraft: { from: null },
      replayOverlay: null,
      waitingForOpponent: false,
    };

    expect(deriveOnlineUiPhase({ ...base, actionPickSubPhase: 'target' })).toBe(
      'pickTarget',
    );
    expect(deriveOnlineUiPhase({ ...base, actionPickSubPhase: 'shield' })).toBe(
      'pickShield',
    );
    expect(deriveOnlineUiPhase({ ...base, actionPickSubPhase: 'heal' })).toBe(
      'pickHeal',
    );
  });
});

describe('computeOnlineWaitingForOpponent', () => {
  it('自分だけ pending 済みなら true', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      stubCard(`C${i}`, 'attack', 50 + i),
    );
    const state = createBattleState(cards, cards);
    const room = battleRoom(state, {
      battle_phase: 'select',
      host_pending_action: { type: 'pass' },
      guest_pending_action: null,
    });

    expect(computeOnlineWaitingForOpponent(room, 'host')).toBe(true);
    expect(computeOnlineWaitingForOpponent(room, 'guest')).toBe(false);
  });
});

describe('isOnlineUiInputLocked', () => {
  it('昇格 UI 中は入力可能、待機・replay 中はロック', () => {
    expect(isOnlineUiInputLocked('promoteUnit')).toBe(false);
    expect(isOnlineUiInputLocked('pickMain')).toBe(false);
    expect(isOnlineUiInputLocked('waitOpponent')).toBe(true);
    expect(isOnlineUiInputLocked('waitOpponentPromotion')).toBe(true);
    expect(isOnlineUiInputLocked('clashReplay')).toBe(true);
  });
});

describe('buildOnlineBattleSessionView', () => {
  it('battle 外は uiPhase=null', () => {
    const view = buildOnlineBattleSessionView({
      room: mapOnlineBattleRoom({
        id: 'room-1',
        code: '123456',
        host_user_id: 'host-user',
        guest_user_id: null,
        host_name: 'Host',
        guest_name: null,
        host_level: 10,
        guest_level: null,
        status: 'waiting',
        host_balance: 0,
        guest_balance: null,
        host_deck: null,
        guest_deck: null,
        host_formation: null,
        guest_formation: null,
        host_setup_ready: false,
        guest_setup_ready: false,
        battle_state: null,
        host_pending_action: null,
        guest_pending_action: null,
        host_rematch_ready: false,
        guest_rematch_ready: false,
        host_deck_change: false,
        guest_deck_change: false,
        disconnect_user_id: null,
        disconnect_deadline: null,
        last_transfer_px: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        expires_at: '2099-01-01T00:00:00.000Z',
        setup_started_at: null,
        closed_by_role: null,
        battle_revision: 0,
        battle_phase: 'select',
        last_clash: null,
        power_balance_applied: false,
      }),
      role: 'host',
      promotionDraft: { from: null },
      replayOverlay: null,
    });

    expect(view.uiPhase).toBeNull();
    expect(view.inputLocked).toBe(true);
  });
});
