import { describe, expect, it } from 'vitest';
import { DECK_MAX, FIELD_SIZE, PALETTE_16 } from '../config/balance';
import { getMaxCanvasSize } from '../config/canvasUnlock';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import { createEmptyGrid } from '../canvas';
import type { Card } from '../types';
import { createCardFromDrawing, computeDeckPower } from '../card';
import { pickCpuPattern } from './cpuPatterns';
import {
  buildBalancedCpuDeck,
  buildCpuCardsForDeckFill,
  buildDeckTargets,
  pickCpuBattleLineup,
  rollCpuDifficulty,
  rollMatchingDurationMs,
} from './cpuDeck';

function stubPlayerDeck(): Card[] {
  return [
    {
      id: 'p1',
      name: 'テストA',
      pixels: [],
      canvasSize: 16,
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
      canvasSize: 16,
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
      canvasSize: 16,
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
      canvasSize: 16,
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
      canvasSize: 16,
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
    const cpu = buildBalancedCpuDeck(player, () => 0.42, 10);
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
    const cpu = buildBalancedCpuDeck(player, () => 0.33, 10);
    const cpuAvg = cpu.reduce((s, c) => s + c.bp, 0) / cpu.length;
    expect(cpuAvg).toBeGreaterThanOrEqual(targets.avgBpMin - 10);
    expect(cpuAvg).toBeLessThanOrEqual(targets.avgBpMax + 10);
    expect(Math.abs(cpuAvg - playerAvg)).toBeLessThan(25);
  });

  it('CPU戦力はプレイヤー同等以上（互角）', () => {
    const player = stubPlayerDeck();
    const playerPower = computeDeckPower(player);
    const targets = buildDeckTargets(player, 'even');
    const cpu = buildBalancedCpuDeck(player, () => 0.33, 10);
    const cpuPower = computeDeckPower(cpu);
    expect(cpuPower).toBeGreaterThanOrEqual(targets.powerMin - 15);
    expect(cpuPower).toBeLessThanOrEqual(targets.powerMax + 15);
    expect(cpuPower).toBeGreaterThanOrEqual(playerPower * 0.95);
  });

  it('強敵は戦力ターゲットが高い', () => {
    const player = stubPlayerDeck();
    const even = buildDeckTargets(player, 'even');
    const strong = buildDeckTargets(player, 'strong');
    expect(strong.powerMin).toBeGreaterThan(even.powerMin);
    expect(strong.powerMax).toBeGreaterThan(even.powerMax);
  });

  it('プレイヤーのレア・★構成を CPU に反映する', () => {
    const player = stubPlayerDeck().map((card, index) => ({
      ...card,
      rarity: (['N', 'R', 'SR', 'UR', 'R'] as const)[index]!,
      stars: (index % 4) as 0 | 1 | 2 | 3,
      bp: card.bp + index * 15,
    }));
    const cpu = buildBalancedCpuDeck(player, () => 0.42, 10);
    const playerRarities = player.map((card) => card.rarity).sort();
    const cpuRarities = cpu.map((card) => card.rarity).sort();
    const playerStars = player.map((card) => card.stars).sort();
    const cpuStars = cpu.map((card) => card.stars).sort();
    expect(cpuRarities).toEqual(playerRarities);
    expect(cpuStars).toEqual(playerStars);
  });

  it('追加色のみの模様でもクラッシュせず生成できる', () => {
    const pixels = createEmptyGrid(24).map((row) =>
      row.map(() => '#2222ff'),
    );
    expect(() =>
      createCardFromDrawing('CPUテスト', pixels, {
        userLevel: 20,
        unlockedPaletteCount: 6,
        canvasSize: 24,
      }),
    ).not.toThrow();
  });

  it('ユーザーレベルに応じたキャンバスサイズと色で生成する', () => {
    const userLevel = 20;
    const cpu = buildBalancedCpuDeck(stubPlayerDeck(), () => 0.42, userLevel);
    const maxSize = getMaxCanvasSize(userLevel);
    const allowedColors = new Set(
      PALETTE_16.slice(0, getUnlockedPaletteCount(userLevel)).map((c) =>
        c.toLowerCase(),
      ),
    );

    for (const card of cpu) {
      expect(card.canvasSize).toBeGreaterThanOrEqual(16);
      expect(card.canvasSize).toBeLessThanOrEqual(maxSize);
      expect(card.pixels).toHaveLength(card.canvasSize);
      for (const cell of card.pixels.flat()) {
        if (cell != null) {
          expect(allowedColors.has(cell.toLowerCase())).toBe(true);
        }
      }
    }
  });
});

describe('rollCpuDifficulty', () => {
  it('強敵判定が動く', () => {
    expect(rollCpuDifficulty(() => 0)).toBe('strong');
    expect(rollCpuDifficulty(() => 0.99)).toBe('even');
  });
});

describe('rollMatchingDurationMs', () => {
  it('2〜4秒の範囲を返す', () => {
    expect(rollMatchingDurationMs(() => 0)).toBe(2000);
    expect(rollMatchingDurationMs(() => 0.999)).toBeGreaterThanOrEqual(3998);
    expect(rollMatchingDurationMs(() => 0.999)).toBeLessThan(4000);
    expect(rollMatchingDurationMs(() => 0.5)).toBe(3000);
  });
});

describe('pickCpuPattern', () => {
  it('指定サイズの模様を返す', () => {
    const colors = PALETTE_16.slice(0, 6);
    const grid = pickCpuPattern('neutral', () => 0.2).build({
      canvasSize: 24,
      colors,
      random: () => 0.2,
    });
    expect(grid).toHaveLength(24);
    expect(grid[0]).toHaveLength(24);
    expect(grid.flat().filter((c) => c != null).length).toBeGreaterThan(0);
    for (const cell of grid.flat()) {
      if (cell != null) {
        expect(colors.map((c) => c.toLowerCase())).toContain(cell.toLowerCase());
      }
    }
  });
});

describe('pickCpuBattleLineup', () => {
  it('5枚から3枚を返す', () => {
    const player = stubPlayerDeck();
    const deck = buildBalancedCpuDeck(player, () => 0.5, 10);
    const lineup = pickCpuBattleLineup(deck, player, () => 0.25);
    expect(lineup).toHaveLength(FIELD_SIZE);
    for (const card of lineup) {
      expect(deck.some((d) => d.id === card.id)).toBe(true);
    }
  });
});

describe('buildCpuCardsForDeckFill', () => {
  it('空デッキ向けに指定枚数を生成する', () => {
    const cards = buildCpuCardsForDeckFill([], 5, () => 0.42, 10);
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.bp).toBeGreaterThan(0);
    }
  });

  it('既存カードは残し空き分だけ追加する', () => {
    const existing = stubPlayerDeck().slice(0, 2);
    const cards = buildCpuCardsForDeckFill(existing, 3, () => 0.42, 10);
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(existing.some((item) => item.name === card.name)).toBe(false);
    }
  });
});
