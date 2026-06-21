import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import type { BattleOutcome, Card } from '../types';
import {
  buildDefeatedCpuLootCards,
  resolveGraveyardLootCards,
} from './graveyardLoot';

function makeCard(id: string, rarity: Card['rarity']): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity,
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeUnit(card: Card, rarity: Card['rarity'] = card.rarity): BattleUnit {
  return {
    cardId: card.id,
    name: card.name,
    attribute: card.attribute,
    maxBp: card.bp,
    currentBp: 0,
    position: 'defeated',
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: false,
    healUsesRemaining: 0,
    bowArrowsRemaining: 0,
    stormUsesRemaining: 0,
    ninjaFirstStrikeUsed: false,
    illuminatedNinjaCardIds: [],
    rarity,
    stars: card.stars,
  };
}

describe('buildDefeatedCpuLootCards', () => {
  it('uses battle unit rarity instead of deck card rarity', () => {
    const deckCard = makeCard('cpu-1', 'N');
    const defeatedUnit = makeUnit(deckCard, 'R');

    const loot = buildDefeatedCpuLootCards([defeatedUnit], [deckCard]);

    expect(loot).toHaveLength(1);
    expect(loot[0]?.rarity).toBe('R');
  });
});

describe('resolveGraveyardLootCards', () => {
  it('merges defeated rarity onto opponent deck snapshot', () => {
    const deckCard = makeCard('cpu-1', 'N');
    const defeatedCard = { ...deckCard, rarity: 'R' as const };
    const outcome: BattleOutcome = {
      winner: 'player',
      playerCardIds: [],
      defeatedPlayerCardIds: [],
      cpuDefeatedCount: 1,
      defeatedCpuCards: [defeatedCard],
      survivorPlayerCards: [],
      playerDeckPower: 10,
      opponentDeckPower: 10,
      defeatedPlayerCards: [],
      opponent: {
        name: 'CPU',
        level: 1,
        deck: [deckCard],
      },
    };

    const loot = resolveGraveyardLootCards(outcome);

    expect(loot).toHaveLength(1);
    expect(loot[0]?.rarity).toBe('R');
  });
});
