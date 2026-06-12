import { describe, expect, it } from 'vitest';
import type { Attribute, Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import { createBattleState } from './battleState';
import {
  enumerateBattleActionChoices,
  hasBattleActionChoices,
  pickPassAction,
} from './actionChoices';
import { pickCpuAction } from './cpu';
import { resolveTurn } from './resolveTurn';

function stubCard(name: string, attr: Attribute, bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

function cards(prefix: string): Card[] {
  return [
    stubCard(`${prefix}A`, 'attack', 80),
    stubCard(`${prefix}B`, 'attack', 70),
    stubCard(`${prefix}C`, 'attack', 60),
    stubCard(`${prefix}D`, 'defense', 50),
    stubCard(`${prefix}E`, 'attack', 40),
  ];
}

describe('actionChoices', () => {
  it('凍結の前衛忍と使用済みの後衛嵐だけではプレイヤー行動がない', () => {
    const playerDeck = [
      stubCard('忍', 'ninja', 80),
      stubCard('P2', 'attack', 50),
      stubCard('嵐', 'storm', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    for (const unit of state.player) {
      if (unit.position !== 'frontLeft' && unit.position !== 'backLeft') {
        unit.position = 'defeated';
        unit.currentBp = 0;
      }
    }
    state.player[0]!.frozenUntilTurn = 99;
    state.player[2]!.stormUsesRemaining = 0;

    expect(hasBattleActionChoices(state, 'player')).toBe(false);
    expect(enumerateBattleActionChoices(state, 'player')).toEqual([]);
  });

  it('行動不能時のパス選択でターンだけ進みプレイヤーは攻撃しない', () => {
    const playerDeck = [
      stubCard('剣', 'attack', 80),
      stubCard('P2', 'attack', 50),
      stubCard('嵐', 'storm', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    for (const unit of state.player) {
      if (unit.position !== 'frontLeft' && unit.position !== 'backLeft') {
        unit.position = 'defeated';
        unit.currentBp = 0;
      }
    }
    state.player[0]!.frozenUntilTurn = 99;
    state.player[2]!.stormUsesRemaining = 0;
    const playerBpBefore = state.player[0]!.currentBp;

    const result = resolveTurn(state, {
      player: pickPassAction(state, 'player'),
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    });

    expect(result.state.turn).toBe(state.turn + 1);
    expect(result.attacks.some((a) => a.fromSide === 'player')).toBe(false);
    expect(result.attacks.some((a) => a.fromSide === 'cpu')).toBe(true);
    expect(result.state.player[0]!.currentBp).toBeLessThan(playerBpBefore);
  });
});
