import type { Attribute } from '../types';

/** L≡1(mod5) の属性解放（Lv1は剣・盾）。docs/ATTRIBUTE_SPEC.md §3 */
export const ATTRIBUTE_UNLOCK_SCHEDULE: ReadonlyArray<{
  level: number;
  attribute: Attribute;
}> = [
  { level: 6, attribute: 'power' },
  { level: 11, attribute: 'bow' },
  { level: 16, attribute: 'dual' },
  { level: 21, attribute: 'poison' },
  { level: 26, attribute: 'heal' },
  { level: 31, attribute: 'ice' },
  { level: 36, attribute: 'storm' },
  { level: 41, attribute: 'ninja' },
];

const BASE_ATTRIBUTES: Attribute[] = ['attack', 'defense'];

/** 作成時に抽選候補となる解放済み属性（剣・盾は常に含む） */
export function getUnlockedAttributes(userLevel: number): Attribute[] {
  const level = Math.max(1, Math.floor(userLevel));
  const unlocked: Attribute[] = [...BASE_ATTRIBUTES];
  for (const { level: unlockLevel, attribute } of ATTRIBUTE_UNLOCK_SCHEDULE) {
    if (level >= unlockLevel) unlocked.push(attribute);
  }
  return unlocked;
}

export function isAttributeUnlockedAtLevel(
  attribute: Attribute,
  userLevel: number,
): boolean {
  return getUnlockedAttributes(userLevel).includes(attribute);
}

export function getAttributeUnlockLevel(attribute: Attribute): number {
  if (attribute === 'attack' || attribute === 'defense') return 1;
  const entry = ATTRIBUTE_UNLOCK_SCHEDULE.find((e) => e.attribute === attribute);
  return entry?.level ?? Number.POSITIVE_INFINITY;
}

/** 直近解放された属性（スケジュール上・Lv1〜5 は null） */
export function getLatestUnlockedAttribute(userLevel: number): Attribute | null {
  const level = Math.max(1, Math.floor(userLevel));
  let latest: Attribute | null = null;
  for (const { level: unlockLevel, attribute } of ATTRIBUTE_UNLOCK_SCHEDULE) {
    if (level >= unlockLevel) latest = attribute;
  }
  return latest;
}
