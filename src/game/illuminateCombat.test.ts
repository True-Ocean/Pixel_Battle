import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import { resolveTurn } from './resolveTurn';
import {
  getIlluminateTargets,
} from './illuminateCombat';
import { isMeleeTargetable } from './ninjaCombat';
import { createBattleState } from './battleState';
import type { Card } from '../types';

function testCard(
  id: string,
  attribute: Card['attribute'],
  bp = 100,
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
    createdAt: '2026-01-01',
  };
}

function unit(partial: Partial<BattleUnit> & Pick<BattleUnit, 'position'>): BattleUnit {
  return {
    cardId: partial.cardId ?? 'u1',
    name: partial.name ?? 'unit',
    attribute: partial.attribute ?? 'attack',
    maxBp: partial.maxBp ?? 100,
    currentBp: partial.currentBp ?? 100,
    position: partial.position,
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: partial.stealthActive ?? false,
    healUsesRemaining: 0,
    bowArrowsRemaining: 0,
    stormUsesRemaining: 0,
    ninjaFirstStrikeUsed: partial.ninjaFirstStrikeUsed ?? false,
    illuminatedNinjaCardIds: partial.illuminatedNinjaCardIds ?? [],
    rarity: 'N',
    stars: 0,
  };
}

describe('illuminateCombat', () => {
  it('ステルス中の敵忍のみ照らし対象', () => {
    const actor = unit({ position: 'backCenter', attribute: 'illuminate' });
    const ninja = unit({
      position: 'frontLeft',
      attribute: 'ninja',
      cardId: 'ninja1',
      stealthActive: true,
    });
    const revealed = unit({
      position: 'frontRight',
      attribute: 'ninja',
      cardId: 'ninja2',
      stealthActive: false,
    });
    expect(getIlluminateTargets(actor, [ninja, revealed])).toEqual(['frontLeft']);
  });

  it('既に照らした敵忍は対象外', () => {
    const actor = unit({
      position: 'backCenter',
      attribute: 'illuminate',
      illuminatedNinjaCardIds: ['ninja1'],
    });
    const ninja = unit({
      position: 'frontLeft',
      attribute: 'ninja',
      cardId: 'ninja1',
      stealthActive: true,
    });
    expect(getIlluminateTargets(actor, [ninja])).toEqual([]);
  });
});

describe('照属性の戦闘', () => {
  it('照らす行動で敵忍のステルスを完全解除する', () => {
    const playerCards = [testCard('ill', 'illuminate', 200)];
    const cpuCards = [testCard('ninja', 'ninja', 120)];
    const state = createBattleState(playerCards, cpuCards);
    const ninja = state.cpu[0]!;
    expect(ninja.stealthActive).toBe(true);

    const { state: next } = resolveTurn(state, {
      player: {
        type: 'illuminate',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    });

    const ninjaAfter = next.cpu[0]!;
    expect(ninjaAfter.stealthActive).toBe(false);
    expect(ninjaAfter.ninjaFirstStrikeUsed).toBe(true);
    expect(isMeleeTargetable(ninjaAfter)).toBe(true);
    const actor = next.player[0]!;
    expect(actor.illuminatedNinjaCardIds).toEqual(['ninja']);
  });

  it('同じ敵忍は2回照らせないが別の忍は照らせる', () => {
    const playerCards = [testCard('ill', 'illuminate', 200)];
    const cpuCards = [
      testCard('ninja1', 'ninja', 120),
      testCard('ninja2', 'ninja', 110),
    ];
    let state = createBattleState(playerCards, cpuCards);
    state.cpu[0]!.position = 'frontLeft';
    state.cpu[1]!.position = 'frontRight';

    const passCpu = {
      type: 'meleeAttack' as const,
      actorPosition: 'frontLeft' as const,
      targetPosition: 'frontLeft' as const,
    };

    state = resolveTurn(state, {
      player: {
        type: 'illuminate',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: passCpu,
    }).state;

    expect(state.cpu[0]!.stealthActive).toBe(false);
    expect(state.cpu[1]!.stealthActive).toBe(true);

    state = resolveTurn(state, {
      player: {
        type: 'illuminate',
        actorPosition: 'frontLeft',
        targetPosition: 'frontRight',
      },
      cpu: passCpu,
    }).state;

    expect(state.cpu[1]!.stealthActive).toBe(false);
    expect(state.player[0]!.illuminatedNinjaCardIds).toEqual(['ninja1', 'ninja2']);
  });
});
