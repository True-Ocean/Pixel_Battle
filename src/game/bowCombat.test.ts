import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import { BOW_ARROWS_PER_BATTLE } from '../config/balance';
import {
  calcBowDamage,
  canUseBowMeleeAction,
  getBowTargets,
} from './bowCombat';
import { getActionTypesForUnit } from './actions/getActionTypesForUnit';
import { createBattleState } from './battleState';

function stubCard(name: string, attr: Card['attribute'], bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

describe('bowCombat', () => {
  it('弓ダメージは currentBp 100%', () => {
    expect(calcBowDamage(80)).toBe(80);
    expect(calcBowDamage(48)).toBe(48);
  });

  it('前衛・後衛どちらからも敵全員をターゲットにできる', () => {
    const state = createBattleState(
      [
        stubCard('P1', 'attack', 50),
        stubCard('P2', 'attack', 50),
        stubCard('弓', 'bow', 80),
        stubCard('P4', 'attack', 50),
        stubCard('P5', 'attack', 50),
      ],
      cards('C'),
    );
    const bow = state.player.find((u) => u.attribute === 'bow')!;
    expect(getBowTargets(state.player, state.cpu, bow.position)).toContain(
      'frontLeft',
    );
    expect(getBowTargets(state.player, state.cpu, bow.position)).toContain(
      'backLeft',
    );

    state.player[0]!.position = 'defeated';
    state.player[0]!.currentBp = 0;
    bow.position = 'frontLeft';
    expect(getBowTargets(state.player, state.cpu, 'frontLeft')).toContain(
      'frontLeft',
    );
    expect(getBowTargets(state.player, state.cpu, 'frontLeft')).toContain(
      'backLeft',
    );
  });

  it('戦闘開始時の弓矢は2本', () => {
    const state = createBattleState(
      [
        stubCard('P1', 'attack', 50),
        stubCard('P2', 'attack', 50),
        stubCard('弓', 'bow', 80),
        stubCard('P4', 'attack', 50),
        stubCard('P5', 'attack', 50),
      ],
      cards('C'),
    );
    const bow = state.player.find((u) => u.attribute === 'bow')!;
    expect(bow.bowArrowsRemaining).toBe(BOW_ARROWS_PER_BATTLE);
  });

  it('矢切れ後は弓攻撃できない', () => {
    const state = createBattleState(
      [
        stubCard('P1', 'attack', 50),
        stubCard('P2', 'attack', 50),
        stubCard('弓', 'bow', 80),
        stubCard('P4', 'attack', 50),
        stubCard('P5', 'attack', 50),
      ],
      cards('C'),
    );
    const bow = state.player.find((u) => u.attribute === 'bow')!;
    bow.bowArrowsRemaining = 0;
    expect(getBowTargets(state.player, state.cpu, bow.position)).toEqual([]);
    expect(getActionTypesForUnit(state.player, state.cpu, bow.position)).toEqual(
      [],
    );
  });

  it('矢切れ後は前衛のみ近接可能', () => {
    const state = createBattleState(
      [
        stubCard('P1', 'attack', 50),
        stubCard('P2', 'attack', 50),
        stubCard('弓', 'bow', 80),
        stubCard('P4', 'attack', 50),
        stubCard('P5', 'attack', 50),
      ],
      cards('C'),
    );
    const bow = state.player.find((u) => u.attribute === 'bow')!;
    bow.bowArrowsRemaining = 0;
    bow.position = 'frontLeft';
    expect(canUseBowMeleeAction(bow, 'frontLeft', state.cpu)).toBe(true);
    expect(getActionTypesForUnit(state.player, state.cpu, 'frontLeft')).toContain(
      'meleeAttack',
    );
    bow.position = 'backLeft';
    expect(canUseBowMeleeAction(bow, 'backLeft', state.cpu)).toBe(false);
  });
});

function cards(prefix: string): Card[] {
  return [
    stubCard(`${prefix}A`, 'attack', 80),
    stubCard(`${prefix}B`, 'attack', 70),
    stubCard(`${prefix}C`, 'attack', 60),
    stubCard(`${prefix}D`, 'defense', 50),
    stubCard(`${prefix}E`, 'attack', 40),
  ];
}
