import { describe, expect, it } from 'vitest';
import { createBattleState, getPendingPromotionFronts } from './battleState';
import { resolveTurn } from './resolveTurn';
import { startNextTurn } from './startNextTurn';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import type { Attribute, Card } from '../types';

function stubCard(name: string, attr: Attribute, bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

describe('startNextTurn', () => {
  it('ターン見出しを付けて毒DoTを適用する', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    const cpuDeck = [
      stubCard('C1', 'attack', 80),
      stubCard('C2', 'attack', 70),
      stubCard('C3', 'attack', 60),
      stubCard('C4', 'defense', 50),
      stubCard('C5', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cpuDeck);
    state.cpu[0].currentBp = 100;

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    const turnStart = startNextTurn(state);
    expect(turnStart.poisonDots).toHaveLength(1);
    expect(turnStart.poisonDots[0]!.damage).toBe(24);
    expect(turnStart.stateAfterDot.cpu[0].currentBp).toBe(0);
    expect(turnStart.stateBeforeDot.log.at(-1)).toBe('--- TURN 2 ---');
  });

  it('毒DoTで前衛が倒れると補充待ちの前衛スロットが残る', () => {
    const playerDeck = [
      stubCard('前衛', 'attack', 50),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    const cpuDeck = [
      stubCard('C1', 'attack', 80),
      stubCard('C2', 'attack', 70),
      stubCard('C3', 'attack', 60),
      stubCard('C4', 'defense', 50),
      stubCard('C5', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cpuDeck);
    state.player[0].currentBp = 16;
    state.player[0].poisonStacks = [
      { sourceCardId: 'poison-src', damagePerTurn: 16 },
    ];

    const turnStart = startNextTurn(state);

    expect(turnStart.stateAfterDot.player[0].position).toBe('defeated');
    expect(getPendingPromotionFronts(turnStart.stateAfterDot.player)).toContain(
      'frontLeft',
    );
  });
});
