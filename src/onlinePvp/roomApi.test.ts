import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBattleState } from '../game/battleState';
import { enumerateBattleActionChoices } from '../game/actionChoices';
import { autoCompleteForcedPromotions, nextPhaseAfterClash } from './onlineBattleAuthority';
import { resolveTurn } from '../game/resolveTurn';
import type { Card } from '../types';
import type { BattleActionChoice, BattleState } from '../types/battle';
import {
  submitOnlineBattleChoice,
  submitOnlinePromotion,
} from './roomApi';
import type { OnlineBattleRoomRow } from './types';

function stub(id: string, bp = 100, attribute: Card['attribute'] = 'attack'): Card {
  return {
    id,
    name: id,
    attribute,
    bp,
    pixels: [],
    canvasSize: 16,
    rarity: 'N',
    stars: 0,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function battleRow(
  battleState: BattleState,
  partial: Partial<OnlineBattleRoomRow> = {},
): OnlineBattleRoomRow {
  return {
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
  };
}

type RowFilter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'not'; column: string; op: string; value: unknown }
  | { kind: 'is'; column: string; value: unknown };

function matchesFilters(row: OnlineBattleRoomRow, filters: RowFilter[]): boolean {
  for (const filter of filters) {
    const cell = row[filter.column as keyof OnlineBattleRoomRow];
    if (filter.kind === 'eq' && cell !== filter.value) return false;
    if (filter.kind === 'is' && filter.value === null && cell !== null) return false;
    if (filter.kind === 'not' && filter.op === 'is' && filter.value === null && cell === null) {
      return false;
    }
  }
  return true;
}

function createMockSupabase(initialRow: OnlineBattleRoomRow) {
  let row = structuredClone(initialRow);

  const applyPatch = (patch: Record<string, unknown>) => {
    row = {
      ...row,
      ...patch,
      updated_at: new Date().toISOString(),
    } as OnlineBattleRoomRow;
    return row;
  };

  const supabase = {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: async () => {
            if (column === 'id' && row.id !== value) {
              return { data: null, error: null };
            }
            return { data: structuredClone(row), error: null };
          },
          single: async () => ({ data: structuredClone(row), error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        const filters: RowFilter[] = [];
        const builder = {
          eq: (column: string, value: unknown) => {
            filters.push({ kind: 'eq', column, value });
            return builder;
          },
          not: (column: string, op: string, value: unknown) => {
            filters.push({ kind: 'not', column, op, value });
            return builder;
          },
          is: (column: string, value: unknown) => {
            filters.push({ kind: 'is', column, value });
            return builder;
          },
          select: (_cols: string) => ({
            single: async () => {
              if (!matchesFilters(row, filters)) {
                return { data: null, error: { message: 'no rows' } };
              }
              return { data: applyPatch(patch), error: null };
            },
            maybeSingle: async () => {
              if (!matchesFilters(row, filters)) {
                return { data: null, error: null };
              }
              return { data: applyPatch(patch), error: null };
            },
          }),
        };
        return builder;
      },
    }),
    rpc: vi.fn(async () => ({ error: null })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  };

  return {
    supabase,
    getRow: () => structuredClone(row),
  };
}

function findClashChoicesWithoutPromotion(state: BattleState): {
  host: BattleActionChoice;
  guest: BattleActionChoice;
} {
  const hostCandidates = enumerateBattleActionChoices(state, 'player');
  for (const host of hostCandidates) {
    for (const guest of enumerateBattleActionChoices(state, 'cpu')) {
      const after = autoCompleteForcedPromotions(
        resolveTurn(state, { player: host, cpu: guest }).state,
      );
      if (nextPhaseAfterClash(after) === 'turn_start') {
        return { host, guest };
      }
    }
  }
  throw new Error('no non-promotion clash choices found');
}

let mockStore: ReturnType<typeof createMockSupabase>;

vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => mockStore.supabase,
}));

describe('roomApi battle phase chaining', () => {
  beforeEach(() => {
    const cards = Array.from({ length: 5 }, (_, i) => stub(`h${i}`, 100, 'defense'));
    const cpu = Array.from({ length: 5 }, (_, i) => stub(`g${i}`, 100, 'defense'));
    mockStore = createMockSupabase(battleRow(createBattleState(cards, cpu)));
  });

  it('submitOnlineBattleChoice は両者選択後 clash から select まで連鎖する', async () => {
    const state = mockStore.getRow().battle_state!;
    const { host: hostPass, guest: guestPass } = findClashChoicesWithoutPromotion(state);

    const hostOnly = await submitOnlineBattleChoice('room-1', 'host', hostPass);
    expect(hostOnly.ok).toBe(true);
    if (!hostOnly.ok) return;
    expect(hostOnly.data.battlePhase).toBe('select');
    expect(hostOnly.data.hostPendingAction).toEqual(hostPass);
    expect(hostOnly.data.guestPendingAction).toBeNull();

    const resolved = await submitOnlineBattleChoice('room-1', 'guest', guestPass);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.data.battlePhase).toBe('select');
    expect(resolved.data.hostPendingAction).toBeNull();
    expect(resolved.data.guestPendingAction).toBeNull();
    expect(resolved.data.battleRevision).toBe(3);
    expect(resolved.data.battleState!.turn).toBe(1);
  });

  it('submitOnlinePromotion は昇格完了後 turn_start から select まで連鎖する', async () => {
    const cards = [stub('h1'), stub('h2'), stub('h3'), stub('h4'), stub('h5')];
    const cpu = [stub('g1'), stub('g2'), stub('g3'), stub('g4'), stub('g5')];
    let state = createBattleState(cards, cpu);
    state = {
      ...state,
      player: state.player.map((u, i) =>
        i === 0 ? { ...u, position: 'defeated' as const, currentBp: 0 } : u,
      ),
    };

    mockStore = createMockSupabase(
      battleRow(state, {
        battle_phase: 'promotion',
        battle_revision: 2,
      }),
    );

    const result = await submitOnlinePromotion(
      'room-1',
      'host',
      'backLeft',
      'frontLeft',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.battlePhase).toBe('select');
    expect(result.data.battleRevision).toBe(4);
    expect(result.data.battleState!.turn).toBe(0);
  });

  it('submitOnlinePromotion は promotion 以外を拒否する', async () => {
    const result = await submitOnlinePromotion(
      'room-1',
      'host',
      'backLeft',
      'frontLeft',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('昇格フェーズではありません');
  });
});
