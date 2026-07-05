import { describe, expect, it } from 'vitest';
import { computeDeckPower } from '../card';
import {
  balanceOnlineDecksForBattle,
  onlinePowerBalanceRelativeGap,
  scaleDeckToTargetPower,
  shouldApplyOnlinePowerBalance,
} from './deckPowerBalance';
import type { Card } from '../types';

function stubCard(id: string, bp: number): Card {
  return {
    id,
    name: id,
    pixels: [],
    canvasSize: 16,
    attribute: 'attack',
    bp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '',
  };
}

function deck(bp: number): Card[] {
  return Array.from({ length: 5 }, (_, i) => stubCard(`c${i}`, bp));
}

describe('onlinePowerBalanceRelativeGap', () => {
  it('平均を分母に相対差を返す', () => {
    expect(onlinePowerBalanceRelativeGap(573, 466)).toBeCloseTo(107 / 519.5, 5);
  });
});

describe('shouldApplyOnlinePowerBalance', () => {
  it('10% 以内は false', () => {
    expect(shouldApplyOnlinePowerBalance(500, 520)).toBe(false);
  });

  it('10% 超は true', () => {
    expect(shouldApplyOnlinePowerBalance(573, 466)).toBe(true);
  });
});

describe('balanceOnlineDecksForBattle', () => {
  it('差が小さいときは補正しない', () => {
    const host = deck(100);
    const guest = deck(105);
    const result = balanceOnlineDecksForBattle(host, guest);
    expect(result.applied).toBe(false);
    expect(result.hostDeck[0]!.bp).toBe(100);
    expect(result.guestDeck[0]!.bp).toBe(105);
  });

  it('差が大きいとき両デッキを平均戦力へ近づける', () => {
    const host = deck(120);
    const guest = deck(80);
    const result = balanceOnlineDecksForBattle(host, guest);
    expect(result.applied).toBe(true);
    expect(result.targetPower).toBe(500);

    const hostAfter = computeDeckPower(result.hostDeck);
    const guestAfter = computeDeckPower(result.guestDeck);
    expect(Math.abs(hostAfter - 500)).toBeLessThan(20);
    expect(Math.abs(guestAfter - 500)).toBeLessThan(20);
  });

  it('元デッキを変更しない', () => {
    const host = deck(200);
    const guest = deck(100);
    balanceOnlineDecksForBattle(host, guest);
    expect(host[0]!.bp).toBe(200);
    expect(guest[0]!.bp).toBe(100);
  });
});

describe('scaleDeckToTargetPower', () => {
  it('属性と名前を維持する', () => {
    const card = stubCard('a', 50);
    card.attribute = 'poison';
    const scaled = scaleDeckToTargetPower([card], 100);
    expect(scaled[0]!.attribute).toBe('poison');
    expect(scaled[0]!.name).toBe('a');
  });
});
