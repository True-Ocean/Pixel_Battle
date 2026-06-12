import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import {
  calcBowDamage,
  calcBowMeleeDamage,
  getBowDamageRatio,
  getBowTargets,
} from './bowCombat';
import { createBattleState } from './battleState';

function stubCard(name: string, attr: Card['attribute'], bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

describe('bowCombat', () => {
  it('後衛から敵前衛は100%・敵後衛は50%', () => {
    expect(getBowDamageRatio('backLeft', 'frontLeft')).toBe(1);
    expect(getBowDamageRatio('backLeft', 'backRight')).toBe(0.5);
    expect(calcBowDamage(80, 'backLeft', 'frontLeft')).toBe(80);
    expect(calcBowDamage(80, 'backLeft', 'backCenter')).toBe(40);
  });

  it('前衛弓は敵後衛へ100%', () => {
    expect(calcBowDamage(40, 'frontLeft', 'backLeft')).toBe(40);
  });

  it('前衛弓の近接与ダメは50%', () => {
    const bow = {
      attribute: 'bow' as const,
      currentBp: 80,
      maxBp: 80,
    };
    expect(calcBowMeleeDamage(bow, 'frontLeft')).toBe(40);
    expect(calcBowMeleeDamage(bow, 'backLeft')).toBe(80);
    const sword = { ...bow, attribute: 'attack' as const };
    expect(calcBowMeleeDamage(sword, 'frontLeft')).toBe(80);
  });

  it('後衛弓のターゲット一覧を返す', () => {
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
    const targets = getBowTargets(state.player, state.cpu, 'backLeft');
    expect(targets).toContain('frontLeft');
    expect(targets).toContain('backLeft');
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
