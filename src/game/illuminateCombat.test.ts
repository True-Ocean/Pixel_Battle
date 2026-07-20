import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import type { BattleUnit, BoardPosition } from '../types/battle';
import { ILLUMINATE_USES_PER_BATTLE } from '../config/balance';
import { createBattleState } from './battleState';
import {
  canUseIlluminateAction,
  getIlluminateTargets,
  isStealthNinjaIlluminateTarget,
} from './illuminateCombat';
import { resolveTurn } from './resolveTurn';

function testCard(
  id: string,
  attribute: Card['attribute'],
  bp: number,
): Card {
  return {
    id,
    name: id,
    pixels: [],
    canvasSize: 16,
    attribute,
    bp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '',
  };
}

function padDeck(cards: Card[]): Card[] {
  const next = [...cards];
  while (next.length < 5) {
    next.push(testCard(`pad${next.length}`, 'attack', 50));
  }
  return next;
}

describe('illuminateCombat', () => {
  it('生存敵なら誰でも照射対象になる', () => {
    const actor = {
      cardId: 'ill',
      name: 'Ill',
      attribute: 'illuminate',
      maxBp: 90,
      currentBp: 90,
      position: 'backCenter',
      illuminateUsesRemaining: 2,
      defenseShieldUsed: false,
      hasShield: false,
      poisonStacks: [],
      poisonDotDamageReceived: false,
      frozenUntilTurn: null,
      stealthActive: false,
      healUsesRemaining: 0,
      bowArrowsRemaining: 0,
      stormUsesRemaining: 0,
      dazzledUntilTurn: null,
      ninjaFirstStrikeUsed: false,
      illuminatedNinjaCardIds: [],
      rarity: 'N',
      stars: 0,
    } as BattleUnit;
    const enemy = [
      {
        cardId: 'a',
        name: 'A',
        attribute: 'attack',
        maxBp: 50,
        currentBp: 50,
        position: 'frontLeft',
        stealthActive: false,
        defenseShieldUsed: false,
        hasShield: false,
        poisonStacks: [],
        poisonDotDamageReceived: false,
        frozenUntilTurn: null,
        healUsesRemaining: 0,
        bowArrowsRemaining: 0,
        stormUsesRemaining: 0,
        illuminateUsesRemaining: 0,
        dazzledUntilTurn: null,
        ninjaFirstStrikeUsed: false,
        illuminatedNinjaCardIds: [],
        rarity: 'N',
        stars: 0,
      },
      {
        cardId: 'n',
        name: 'N',
        attribute: 'ninja',
        maxBp: 50,
        currentBp: 50,
        position: 'frontRight',
        stealthActive: true,
        defenseShieldUsed: false,
        hasShield: false,
        poisonStacks: [],
        poisonDotDamageReceived: false,
        frozenUntilTurn: null,
        healUsesRemaining: 0,
        bowArrowsRemaining: 0,
        stormUsesRemaining: 0,
        illuminateUsesRemaining: 0,
        dazzledUntilTurn: null,
        ninjaFirstStrikeUsed: false,
        illuminatedNinjaCardIds: [],
        rarity: 'N',
        stars: 0,
      },
    ] as BattleUnit[];
    const targets = getIlluminateTargets(actor, enemy);
    expect(targets).toContain('frontLeft');
    expect(targets).toContain('frontRight');
  });

  it('照射回数が0なら使えない', () => {
    const actor = {
      attribute: 'illuminate',
      illuminateUsesRemaining: 0,
    } as BattleUnit;
    const enemy = [
      {
        cardId: 'a',
        attribute: 'attack',
        currentBp: 50,
        position: 'frontLeft',
        stealthActive: false,
      },
    ] as BattleUnit[];
    expect(canUseIlluminateAction(actor, enemy)).toBe(false);
  });

  it('潜伏忍への照射は解除のみで目眩しない', () => {
    const state0 = createBattleState(
      padDeck([testCard('ill', 'illuminate', 90)]),
      padDeck([testCard('ninja', 'ninja', 100)]),
    );
    const ill = state0.player.find((u) => u.attribute === 'illuminate')!;
    const ninja = state0.cpu.find((u) => u.attribute === 'ninja')!;
    expect(ninja.stealthActive).toBe(true);
    expect(isStealthNinjaIlluminateTarget(ninja)).toBe(true);

    const state = resolveTurn(state0, {
      player: {
        type: 'illuminate',
        actorPosition: ill.position as BoardPosition,
        targetPosition: ninja.position as BoardPosition,
      },
      cpu: {
        type: 'pass',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    const ninjaAfter = state.cpu.find((u) => u.cardId === ninja.cardId)!;
    expect(ninjaAfter.stealthActive).toBe(false);
    expect(ninjaAfter.dazzledUntilTurn).toBeNull();
    expect(ninjaAfter.currentBp).toBe(100);
    const illAfter = state.player.find((u) => u.cardId === ill.cardId)!;
    expect(illAfter.illuminateUsesRemaining).toBe(ILLUMINATE_USES_PER_BATTLE - 1);
  });

  it('通常の敵への照射は目眩を与える', () => {
    const state0 = createBattleState(
      padDeck([testCard('ill', 'illuminate', 90)]),
      padDeck([testCard('c0', 'attack', 100)]),
    );
    const ill = state0.player.find((u) => u.attribute === 'illuminate')!;
    const target = state0.cpu[0]!;

    const state = resolveTurn(state0, {
      player: {
        type: 'illuminate',
        actorPosition: ill.position as BoardPosition,
        targetPosition: target.position as BoardPosition,
      },
      cpu: {
        type: 'pass',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    const targetAfter = state.cpu.find((u) => u.cardId === target.cardId)!;
    expect(targetAfter.currentBp).toBe(80);
    expect(targetAfter.maxBp).toBe(80);
    expect(targetAfter.dazzledUntilTurn).not.toBeNull();
  });
});
