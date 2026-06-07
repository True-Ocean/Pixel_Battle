import { describe, expect, it } from 'vitest';
import { DECK_MAX, FIELD_SIZE } from '../config/balance';
import type { Card } from '../types';
import { pickCpuPattern } from './cpuPatterns';
import {
  buildBalancedCpuDeck,
  buildDeckTargets,
  pickCpuBattleLineup,
  rollCpuDifficulty,
} from './cpuDeck';

function stubPlayerDeck(): Card[] {
  return [
    {
      id: 'p1',
      name: 'テストA',
      pixels: [],
      attribute: 'attack',
      bp: 85,
      wins: 0,
      losses: 0,
      reviveCount: 0,
      rarity: 'N',
      stars: 0,
      createdAt: '',
    },
    {
      id: 'p2',
      name: 'テストB',
      pixels: [],
      attribute: 'attack',
      bp: 90,
      wins: 0,
      losses: 0,
      reviveCount: 0,
      rarity: 'N',
      stars: 0,
      createdAt: '',
    },
    {
      id: 'p3',
      name: 'テストC',
      pixels: [],
      attribute: 'defense',
      bp: 70,
      wins: 0,
      losses: 0,
      reviveCount: 0,
      rarity: 'N',
      stars: 0,
      createdAt: '',
    },
    {
      id: 'p4',
      name: 'テストD',
      pixels: [],
      attribute: 'defense',
      bp: 75,
      wins: 0,
      losses: 0,
      reviveCount: 0,
      rarity: 'N',
      stars: 0,
      createdAt: '',
    },
    {
      id: 'p5',
      name: 'テストE',
      pixels: [],
      attribute: 'defense',
      bp: 80,
      wins: 0,
      losses: 0,
      reviveCount: 0,
      rarity: 'N',
      stars: 0,
      createdAt: '',
    },
  ];
}

describe('buildBalancedCpuDeck', () => {
  it('5枚の Card を返しピクセルは模様テンプレート由来', () => {
    const player = stubPlayerDeck();
    const cpu = buildBalancedCpuDeck(player, () => 0.42);
    expect(cpu).toHaveLength(DECK_MAX);
    for (const card of cpu) {
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.bp).toBeGreaterThan(0);
      const painted = card.pixels.flat().filter((c) => c != null).length;
      expect(painted).toBeGreaterThan(8);
    }
  });

  it('プレイヤー平均 BP の近傍に収まる（互角）', () => {
    const player = stubPlayerDeck();
    const playerAvg = player.reduce((s, c) => s + c.bp, 0) / player.length;
    const targets = buildDeckTargets(player, 'even');
    const cpu = buildBalancedCpuDeck(player, () => 0.33);
    const cpuAvg = cpu.reduce((s, c) => s + c.bp, 0) / cpu.length;
    expect(cpuAvg).toBeGreaterThanOrEqual(targets.avgBpMin - 8);
    expect(cpuAvg).toBeLessThanOrEqual(targets.avgBpMax + 8);
    expect(Math.abs(cpuAvg - playerAvg)).toBeLessThan(25);
  });

  it('強敵は平均 BP ターゲットが高い', () => {
    const player = stubPlayerDeck();
    const even = buildDeckTargets(player, 'even');
    const strong = buildDeckTargets(player, 'strong');
    expect(strong.avgBpMin).toBeGreaterThan(even.avgBpMin);
  });
});

describe('rollCpuDifficulty', () => {
  it('強敵判定が動く', () => {
    expect(rollCpuDifficulty(() => 0)).toBe('strong');
    expect(rollCpuDifficulty(() => 0.99)).toBe('even');
  });
});

describe('pickCpuPattern', () => {
  it('16x16 の模様を返す', () => {
    const grid = pickCpuPattern('neutral', () => 0.2).build(() => 0.2);
    expect(grid).toHaveLength(16);
    expect(grid[0]).toHaveLength(16);
    expect(grid.flat().filter((c) => c != null).length).toBeGreaterThan(0);
  });
});

describe('pickCpuBattleLineup', () => {
  it('5枚から3枚を返す', () => {
    const player = stubPlayerDeck();
    const deck = buildBalancedCpuDeck(player, () => 0.5);
    const lineup = pickCpuBattleLineup(deck, player, () => 0.25);
    expect(lineup).toHaveLength(FIELD_SIZE);
    for (const card of lineup) {
      expect(deck.some((d) => d.id === card.id)).toBe(true);
    }
  });
});
