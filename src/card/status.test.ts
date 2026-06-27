import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  applyCardRevive,
  canReviveLostCard,
  isCardLost,
  isReviveCapReached,
  markCardActive,
  markCardLost,
  normalizeCardStatus,
} from './status';

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    name: 'test',
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeCardStatus', () => {
  it('treats unknown values as active', () => {
    expect(normalizeCardStatus(undefined)).toBe('active');
    expect(normalizeCardStatus('lost')).toBe('lost');
  });
});

describe('card lost helpers', () => {
  it('detects lost cards', () => {
    expect(isCardLost(card())).toBe(false);
    expect(isCardLost(card({ status: 'active' }))).toBe(false);
    expect(isCardLost(card({ status: 'lost' }))).toBe(true);
  });

  it('marks and clears lost status', () => {
    const active = card();
    const lost = markCardLost(active);
    expect(lost.status).toBe('lost');
    expect(markCardLost(lost)).toBe(lost);

    const revived = markCardActive(lost);
    expect(revived.status).toBe('active');
    expect(markCardActive(active)).toBe(active);
  });

  it('fully revives lost cards up to cap', () => {
    const lost = markCardLost(card({ reviveCount: 2 }));
    expect(canReviveLostCard(lost)).toBe(true);
    const revived = applyCardRevive(lost);
    expect(revived.status).toBe('active');
    expect(revived.reviveCount).toBe(3);
    expect(canReviveLostCard(revived)).toBe(false);
    expect(isReviveCapReached(revived)).toBe(true);
    expect(applyCardRevive(revived)).toBe(revived);
  });

  it('blocks revive at cap', () => {
    const lost = markCardLost(card({ reviveCount: 3, status: 'lost' }));
    expect(canReviveLostCard(lost)).toBe(false);
    expect(applyCardRevive(lost)).toBe(lost);
  });
});
