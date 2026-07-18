import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from '../canvas';
import { createCardFromDrawing } from '../card';
import type { Attribute, Card } from '../types';
import { createBattleState, getPendingPromotionFronts } from '../game/battleState';
import {
  autoCompleteForcedPromotions,
  onlinePromotionNeeded,
  targetOnlineBattlePhaseForState,
} from './onlineBattleAuthority';
import { getUnitAt } from '../game/battleState';

function stubCard(name: string, attr: Attribute, bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

describe('onlineBattleAuthority', () => {
  it('1択の前衛補充のみ自動適用し、複数候補は残す', () => {
    const cards = [
      stubCard('A', 'attack', 80),
      stubCard('B', 'attack', 70),
      stubCard('C', 'attack', 60),
      stubCard('D', 'defense', 50),
      stubCard('E', 'attack', 40),
    ];
    let state = createBattleState(cards, cards);
    state = {
      ...state,
      player: state.player.map((u, i) =>
        i === 0
          ? { ...u, position: 'defeated' as const, currentBp: 0 }
          : u,
      ),
      cpu: state.cpu.map((u, i) =>
        i === 0
          ? { ...u, position: 'defeated' as const, currentBp: 0 }
          : u,
      ),
    };
    expect(getPendingPromotionFronts(state.player).length).toBe(1);
    expect(getPendingPromotionFronts(state.cpu).length).toBe(1);

    const completed = autoCompleteForcedPromotions(state);
    expect(onlinePromotionNeeded(completed)).toBe(true);
    expect(getPendingPromotionFronts(completed.player).length).toBe(1);
    expect(getPendingPromotionFronts(completed.cpu).length).toBe(1);
  });

  it('frontRight 空き + backRight のみのとき 1 択で前衛補充される', () => {
    const cards = [
      stubCard('Ninja', 'attack', 21),
      stubCard('EmptyFront', 'attack', 22),
      stubCard('Fire', 'attack', 72),
      stubCard('EmptyBack', 'attack', 50),
      stubCard('Bow', 'attack', 22),
    ];
    let state = createBattleState(cards, cards);
    state = {
      ...state,
      player: state.player.map((u, i) => {
        if (i === 1 || i === 3) {
          return { ...u, position: 'defeated' as const, currentBp: 0 };
        }
        return u;
      }),
    };
    expect(getPendingPromotionFronts(state.player)).toEqual(['frontRight']);

    const completed = autoCompleteForcedPromotions(state);
    expect(onlinePromotionNeeded(completed)).toBe(false);
    expect(getUnitAt(completed.player, 'frontRight')?.name).toBe('Bow');
    expect(getUnitAt(completed.player, 'backRight')).toBeUndefined();
  });

  it('targetOnlineBattlePhaseForState は select+昇格必要を promotion に戻す', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      stubCard(`C${i}`, 'attack', 50 + i),
    );
    let state = createBattleState(cards, cards);
    state = {
      ...state,
      player: state.player.map((u, i) =>
        i === 0
          ? { ...u, position: 'defeated' as const, currentBp: 0 }
          : u,
      ),
    };
    expect(targetOnlineBattlePhaseForState(state, 'select')).toBe('promotion');
    expect(targetOnlineBattlePhaseForState(state, 'promotion')).toBeNull();
  });
});
