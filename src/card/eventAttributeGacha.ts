import {
  getAttributeUnlockLevel,
  getLatestUnlockedAttribute,
  getUnlockedAttributes,
} from '../config/attributeUnlock';
import {
  EVENT_ATTRIBUTE_GACHA_FEATURED_RATE,
  EVENT_ATTRIBUTE_GACHA_MIN_LEVEL,
  EVENT_ATTRIBUTE_GACHA_PITY,
} from '../config/economy';
import type { Attribute } from '../types';

export interface AttributeEventGachaState {
  /** フィーチャー属性が連続で出なかった回数（0〜pity-1） */
  pityMissCount: number;
  /** カウンタ対象のフィーチャー属性（変わったらリセット） */
  featuredAttribute: Attribute | null;
}

export function createInitialAttributeEventGachaState(): AttributeEventGachaState {
  return { pityMissCount: 0, featuredAttribute: null };
}

export function normalizeAttributeEventGachaState(
  raw: unknown,
): AttributeEventGachaState {
  if (!raw || typeof raw !== 'object') {
    return createInitialAttributeEventGachaState();
  }
  const record = raw as Record<string, unknown>;
  const pityMissCount =
    typeof record.pityMissCount === 'number' && Number.isFinite(record.pityMissCount)
      ? Math.max(0, Math.floor(record.pityMissCount))
      : 0;
  const featuredAttribute =
    typeof record.featuredAttribute === 'string'
      ? (record.featuredAttribute as Attribute)
      : null;
  return {
    pityMissCount: Math.min(pityMissCount, EVENT_ATTRIBUTE_GACHA_PITY - 1),
    featuredAttribute,
  };
}

/** Lv21以降の直近解放属性（期間限定のフィーチャー） */
export function getEventGachaFeaturedAttribute(
  userLevel: number,
): Attribute | null {
  const level = Math.max(1, Math.floor(userLevel));
  if (level < EVENT_ATTRIBUTE_GACHA_MIN_LEVEL) return null;
  const latest = getLatestUnlockedAttribute(level);
  if (!latest) return null;
  if (getAttributeUnlockLevel(latest) < EVENT_ATTRIBUTE_GACHA_MIN_LEVEL) {
    return null;
  }
  return latest;
}

/**
 * 期間限定ガチャ表示可否。
 * Lv21以降、直近解放属性について「次の属性解放Lv未満」のあいだ有効。
 * 最終属性（illuminate）は次がないため Lv46+ で常時表示。
 */
export function isEventAttributeGachaAvailable(userLevel: number): boolean {
  return getEventGachaFeaturedAttribute(userLevel) != null;
}

/** フィーチャー変更時は天井をリセット（初回の null→紐付けはカウント維持） */
export function syncAttributeEventGachaState(
  state: AttributeEventGachaState,
  userLevel: number,
): AttributeEventGachaState {
  const featured = getEventGachaFeaturedAttribute(userLevel);
  if (featured === state.featuredAttribute) {
    return state;
  }
  if (state.featuredAttribute == null && featured != null) {
    return {
      featuredAttribute: featured,
      pityMissCount: state.pityMissCount,
    };
  }
  return { featuredAttribute: featured, pityMissCount: 0 };
}

/**
 * 期間限定ガチャ1回分の抽選。
 * - 通常: フィーチャー属性 20%、それ以外は解放済みの残りから均等
 * - pityMissCount が PITY-1 以上ならフィーチャー確定
 */
export function rollEventAttributeGacha(
  userLevel: number,
  pityMissCount: number,
  random: () => number = Math.random,
): { attribute: Attribute; nextPityMissCount: number } {
  const featured = getEventGachaFeaturedAttribute(userLevel);
  const unlocked = getUnlockedAttributes(userLevel);
  if (!featured || unlocked.length === 0) {
    return { attribute: unlocked[0] ?? 'attack', nextPityMissCount: 0 };
  }

  const forceFeatured =
    pityMissCount >= EVENT_ATTRIBUTE_GACHA_PITY - 1 || unlocked.length === 1;
  let attribute: Attribute;
  if (forceFeatured) {
    attribute = featured;
  } else if (random() < EVENT_ATTRIBUTE_GACHA_FEATURED_RATE) {
    attribute = featured;
  } else {
    const others = unlocked.filter((entry) => entry !== featured);
    if (others.length === 0) {
      attribute = featured;
    } else {
      const index = Math.floor(random() * others.length);
      attribute = others[Math.min(index, others.length - 1)]!;
    }
  }

  return {
    attribute,
    nextPityMissCount: attribute === featured ? 0 : pityMissCount + 1,
  };
}
