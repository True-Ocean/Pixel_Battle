import { describe, expect, it } from 'vitest';
import { createBattleState, getPendingPromotionFronts } from './battleState';
import { resolveTurn } from './resolveTurn';
import { isFrozen, getSelectionTurn } from './iceCombat';
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

  it('凍結期限を過ぎたユニットの frozenUntilTurn をクリアする', () => {
    const playerDeck = [
      stubCard('氷', 'ice', 80),
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
    const cpuPass = {
      type: 'grantShield' as const,
      actorPosition: 'backCenter' as const,
      targetPosition: 'frontRight' as const,
    };

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: cpuPass,
    }).state;
    expect(state.cpu[0].frozenUntilTurn).toBe(2);

    state = resolveTurn(state, { player: cpuPass, cpu: cpuPass }).state;
    expect(state.turn).toBe(2);
    expect(isFrozen(state.cpu[0]!, getSelectionTurn(state))).toBe(false);

    const turnStart = startNextTurn(state);
    expect(turnStart.stateAfterDot.cpu[0].frozenUntilTurn).toBeNull();
  });
});
