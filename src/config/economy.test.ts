import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  COLOR_DIVERSITY_MAX_MULTIPLIER,
  GRAVEYARD_SQRT_MULTIPLIER,
  REVIVE_PAINTED_MULTIPLIER,
  LEVEL_UP_PIXEL_REWARD,
  LOST_MIN_USER_LEVEL,
  TALISMAN_STARTER_GRANT_COUNT,
  TALISMAN_STARTER_GRANT_LEVEL,
  PIXELS_PER_SURVIVOR,
  calcCardDeleteRefundPixels,
  calcColorDiversityMultiplier,
  calcReviveCost,
  calcGraveyardPixelReward,
  calcGraveyardShardReward,
  calcLostCardDeleteRewards,
  canReviveCard,
  isReviveCapReached,
  REVIVE_CAP,
  calcLevelUpPixels,
  calcLevelUpJewels,
  calcLevelUpTalismanGrant,
  calcLevelUpUniversalShards,
  calcLevelUpUniversalLimitBreak,
  calcLimitBreakBpGain,
  calcTotalLevelUpJewels,
  getLimitBreakRarityJewelCost,
  getLimitBreakShardsRequired,
  calcLostSelectionWeight,
  calcSurvivorPixels,
  calcVictoryBattlePixels,
  countBattleSurvivors,
  canAffordCardRename,
  canAffordCanvasUpgrade,
  calcEditorSaveCharges,
  canAffordAttributeRetouch,
  canAffordAttributeSelect,
  canAffordEditorSave,
  canAffordDeckUnlock,
  calcCanvasUpgradeCost,
  getCardRenameCount,
  PIXEL_COST_RENAME,
  JEWEL_COST_DECK_UNLOCK,
  pickWeightedLostCard,
} from './economy';

function makeCard(
  pixels: (string | null)[][],
  overrides: Partial<Card> = {},
): Card {
  return {
    id: 'test',
    name: 'Test',
    pixels,
    canvasSize: pixels.length,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('economy constants', () => {
  it('uses agreed balance values', () => {
    expect(LEVEL_UP_PIXEL_REWARD).toBe(100);
    expect(LOST_MIN_USER_LEVEL).toBe(5);
    expect(TALISMAN_STARTER_GRANT_LEVEL).toBe(5);
    expect(TALISMAN_STARTER_GRANT_COUNT).toBe(1);
    expect(REVIVE_PAINTED_MULTIPLIER).toBe(3);
    expect(PIXELS_PER_SURVIVOR).toBe(10);
    expect(GRAVEYARD_SQRT_MULTIPLIER).toBe(1);
  });
});

describe('calcLimitBreakBpGain', () => {
  it('基礎BPの3%を加算（最低1）', () => {
    expect(calcLimitBreakBpGain(100)).toBe(3);
    expect(calcLimitBreakBpGain(40)).toBe(1);
    expect(calcLimitBreakBpGain(0)).toBe(1);
  });
});

describe('getLimitBreakRarityJewelCost', () => {
  it('レア昇格ごとのジュエルコスト', () => {
    expect(getLimitBreakRarityJewelCost('N')).toBe(50);
    expect(getLimitBreakRarityJewelCost('R')).toBe(100);
    expect(getLimitBreakRarityJewelCost('SR')).toBe(200);
    expect(getLimitBreakRarityJewelCost('UR')).toBeNull();
  });
});

describe('getLimitBreakShardsRequired', () => {
  it('現在レア度ごとのかけら必要数', () => {
    expect(getLimitBreakShardsRequired('N')).toBe(10);
    expect(getLimitBreakShardsRequired('R')).toBe(15);
    expect(getLimitBreakShardsRequired('SR')).toBe(20);
    expect(getLimitBreakShardsRequired('UR')).toBe(20);
    expect(getLimitBreakShardsRequired('L')).toBe(20);
  });
});

describe('calcLevelUpPixels', () => {
  it('returns fixed 100 regardless of level', () => {
    expect(calcLevelUpPixels(5)).toBe(100);
    expect(calcLevelUpPixels(20)).toBe(100);
  });
});

describe('calcLevelUpJewels', () => {
  it('returns base jewels every level', () => {
    expect(calcLevelUpJewels(1)).toBe(10);
    expect(calcLevelUpJewels(12)).toBe(10);
  });

  it('totals jewels without bonus', () => {
    expect(calcTotalLevelUpJewels([9, 10])).toBe(20);
  });
});

describe('calcLevelUpUniversalShards', () => {
  it('grants shards at L≡4 (mod5), L≥5', () => {
    expect(calcLevelUpUniversalShards(4)).toBe(0);
    expect(calcLevelUpUniversalShards(9)).toBe(20);
    expect(calcLevelUpUniversalShards(10)).toBe(0);
  });

  it('deprecated alias still works', () => {
    expect(calcLevelUpUniversalLimitBreak(14)).toBe(20);
    expect(calcLevelUpUniversalLimitBreak(20)).toBe(0);
  });
});

describe('calcLevelUpTalismanGrant', () => {
  it('grants talisman at Lv20,30,40,50', () => {
    expect(calcLevelUpTalismanGrant(19)).toBe(0);
    expect(calcLevelUpTalismanGrant(20)).toBe(1);
    expect(calcLevelUpTalismanGrant(25)).toBe(0);
    expect(calcLevelUpTalismanGrant(50)).toBe(1);
  });
});

describe('calcReviveCost', () => {
  it('uses floor(painted × 3 × rarity × stars); min 1 when unpainted', () => {
    const filled = Array.from({ length: 16 }, () =>
      Array.from({ length: 16 }, () => '#ff0000'),
    );
    const card256 = makeCard(filled);
    expect(calcReviveCost(card256)).toBe(768);

    const srStars3 = makeCard(filled, { rarity: 'SR', stars: 3 });
    expect(calcReviveCost(srStars3)).toBe(
      Math.floor(256 * 3 * 1.6 * 1.5),
    );

    const empty = makeCard(
      Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null)),
    );
    expect(calcReviveCost(empty)).toBe(1);
  });
});

describe('revive cap', () => {
  it('allows revive below cap only', () => {
    const filled = Array.from({ length: 16 }, () =>
      Array.from({ length: 16 }, () => '#ff0000'),
    );
    const below = makeCard(filled, { reviveCount: 2 });
    const atCap = makeCard(filled, { reviveCount: REVIVE_CAP });
    expect(canReviveCard(below)).toBe(true);
    expect(canReviveCard(atCap)).toBe(false);
    expect(isReviveCapReached(atCap)).toBe(true);
  });
});

describe('calcColorDiversityMultiplier', () => {
  it('starts at 1.0 for one color', () => {
    expect(calcColorDiversityMultiplier(1)).toBe(1);
  });

  it('caps at 1.3', () => {
    expect(calcColorDiversityMultiplier(10)).toBe(COLOR_DIVERSITY_MAX_MULTIPLIER);
  });
});

describe('calcSurvivorPixels', () => {
  it('multiplies survivor count by 10', () => {
    expect(calcSurvivorPixels(3)).toBe(30);
    expect(calcSurvivorPixels(5)).toBe(50);
  });
});

describe('calcGraveyardPixelReward', () => {
  it('uses sqrt painted × color multiplier', () => {
    const filled = Array.from({ length: 16 }, () =>
      Array.from({ length: 16 }, () => '#ff0000'),
    );
    expect(calcGraveyardPixelReward(makeCard(filled))).toBe(16);
  });

  it('returns 0 for empty art', () => {
    const empty = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => null),
    );
    expect(calcGraveyardPixelReward(makeCard(empty))).toBe(0);
  });
});


describe('calcGraveyardShardReward', () => {
  it('returns shard count by rarity', () => {
    const card = makeCard([[ '#ff0000' ]]);
    expect(calcGraveyardShardReward(card)).toBe(1);
    expect(calcGraveyardShardReward({ ...card, rarity: 'R' })).toBe(2);
    expect(calcGraveyardShardReward({ ...card, rarity: 'SR' })).toBe(3);
  });
});

describe('calcVictoryBattlePixels', () => {
  it('combines halved survivor and graveyard battle rewards', () => {
    const card = makeCard([
      ['#ff0000', '#00ff00'],
      ['#0000ff', null],
    ]);
    const result = calcVictoryBattlePixels(
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b'],
      card,
    );
    expect(countBattleSurvivors(['a', 'b', 'c', 'd', 'e'], ['a', 'b'])).toBe(3);
    expect(result.survivorPixels).toBe(15);
    expect(result.graveyardPixels).toBe(0);
    expect(result.total).toBe(15);
  });

  it('does not change delete refund graveyard formula', () => {
    const card = makeCard([
      ['#ff0000', '#00ff00'],
      ['#0000ff', null],
    ]);
    expect(calcCardDeleteRefundPixels(card)).toBe(1);
  });
});

describe('lost economy helpers', () => {
  it('weights selection by px, rarity, and stars', () => {
    const base = makeCard([[ '#ff0000', null ], [ null, null ]]);
    const heavy = makeCard([[ '#ff0000', '#00ff00' ], [ '#0000ff', '#ffff00' ]], {
      rarity: 'SR',
      stars: 3,
    });

    expect(calcLostSelectionWeight(base)).toBeGreaterThan(0);
    expect(calcLostSelectionWeight(heavy)).toBeGreaterThan(calcLostSelectionWeight(base));
  });

  it('uses at least 1 px in lost weight even for empty art', () => {
    const empty = makeCard(Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null)));
    expect(calcLostSelectionWeight(empty)).toBe(1);
  });

  it('picks weighted card deterministically with fixed random', () => {
    const cards = [
      makeCard([[ '#ff0000' ]], { id: 'a' }),
      makeCard([[ '#ff0000', '#00ff00' ]], { id: 'b', rarity: 'SR', stars: 3 }),
    ];
    expect(pickWeightedLostCard(cards, () => 0).id).toBe('a');
    expect(pickWeightedLostCard(cards, () => 0.999).id).toBe('b');
  });

  it('returns refund pixels using graveyard reward formula', () => {
    const card = makeCard([
      ['#ff0000', '#00ff00'],
      ['#0000ff', null],
    ]);
    expect(calcCardDeleteRefundPixels(card)).toBe(calcGraveyardPixelReward(card));
  });

  it('returns card delete rewards as px refund and graveyard shards', () => {
    const card = makeCard([[ '#ff0000', '#00ff00' ]], { rarity: 'R' });
    expect(calcLostCardDeleteRewards(card)).toEqual({
      pixels: calcCardDeleteRefundPixels(card),
      shards: calcGraveyardShardReward(card),
    });
  });

  it('tracks card rename count and affordability', () => {
    expect(getCardRenameCount({})).toBe(0);
    expect(getCardRenameCount({ renameCount: 2 })).toBe(2);
    expect(canAffordCardRename({ freePixels: PIXEL_COST_RENAME })).toBe(true);
    expect(canAffordCardRename({ freePixels: PIXEL_COST_RENAME - 1 })).toBe(
      false,
    );
  });

  it('checks deck unlock affordability', () => {
    expect(canAffordDeckUnlock({ jewels: JEWEL_COST_DECK_UNLOCK })).toBe(true);
    expect(canAffordDeckUnlock({ jewels: JEWEL_COST_DECK_UNLOCK - 1 })).toBe(
      false,
    );
  });

  it('calculates canvas upgrade cost as area difference', () => {
    expect(calcCanvasUpgradeCost(16, 20)).toBe(144);
    expect(calcCanvasUpgradeCost(16, 18)).toBe(68);
    expect(calcCanvasUpgradeCost(18, 20)).toBe(76);
    expect(calcCanvasUpgradeCost(20, 16)).toBe(0);
    expect(canAffordCanvasUpgrade({ freePixels: 144 }, 144)).toBe(true);
    expect(canAffordCanvasUpgrade({ freePixels: 143 }, 144)).toBe(false);
  });

  it('calculates editor save charges for rename and canvas upgrade', () => {
    const rename = calcEditorSaveCharges({
      nameChanged: true,
      editCanvasSize: 16,
      pendingCanvasSize: 16,
    });
    expect(rename).toEqual({
      canvasUpgradePx: 0,
      renamePixelCost: PIXEL_COST_RENAME,
    });

    const both = calcEditorSaveCharges({
      nameChanged: true,
      editCanvasSize: 16,
      pendingCanvasSize: 18,
    });
    expect(both.renamePixelCost).toBe(PIXEL_COST_RENAME);
    expect(both.canvasUpgradePx).toBe(68);
    expect(canAffordEditorSave({ freePixels: 68 + PIXEL_COST_RENAME }, both)).toBe(
      true,
    );

    const unchanged = calcEditorSaveCharges({
      nameChanged: false,
      editCanvasSize: 16,
      pendingCanvasSize: 16,
    });
    expect(unchanged.renamePixelCost).toBe(0);
  });

  it('checks attribute retouch and select affordability', () => {
    expect(canAffordAttributeRetouch({ freePixels: 300 })).toBe(true);
    expect(canAffordAttributeRetouch({ freePixels: 299 })).toBe(false);
    expect(canAffordAttributeSelect({ jewels: 100 })).toBe(true);
    expect(canAffordAttributeSelect({ jewels: 99 })).toBe(false);
  });
});
