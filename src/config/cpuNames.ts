import { finalizeCardNameForCreation } from '../card/cardNameInput';

const CPU_NAME_ADJECTIVES = [
  'なぞ',
  'ふし',
  'かげ',
  'ほの',
  'くろ',
  'しろ',
  'あか',
  'よわ',
  'つよ',
  'わく',
  'うす',
  'こい',
  'みず',
  'ひ',
  'つき',
  'ほし',
  'ゆめ',
  'かぜ',
  'いな',
  'むげ',
  'ちい',
  'おお',
  'とお',
  'ちか',
  'ふる',
  'あた',
  'しず',
  'さけ',
  'ねむ',
  'さむ',
] as const;

const CPU_NAME_NOUNS = [
  'ぶき',
  'たて',
  'まもの',
  'ひと',
  'かみ',
  'けもの',
  'たま',
  'いし',
  'かぜ',
  'つき',
  'ほし',
  'は',
  'つば',
  'かげ',
  'ひか',
  'うみ',
  'やま',
  'くも',
  'かけ',
  'かけら',
  'こた',
  'かべ',
  'とび',
  'ねこ',
  'とり',
  'うお',
  'かぶ',
  'まく',
  'かん',
  'ふう',
] as const;

const CPU_NAME_EPITHETS = ['', '改', '乙', '弐', '仮', '零'] as const;

export const CPU_PATTERN_NAMES: Readonly<Record<string, readonly string[]>> = {
  'stripes-h': ['よこしま', 'しま', 'ぼう'],
  'stripes-v': ['たてしま', 'たてぼう', 'れん'],
  'stripes-d': ['ななめ', '斜線', 'しゃ'],
  'checker': ['ぎょう', 'チェッカー', 'マス'],
  'cross': ['じゅう', 'クロス', 'てん'],
  'diamond': ['ひし', 'ダイヤ', 'ほし'],
  'ring': ['わ', 'リング', 'くわ'],
  'corners': ['よすみ', 'カド', 'しかく'],
  'dots': ['てん', 'ドット', 'ほし'],
  'border': ['わく', 'フレーム', 'へり'],
  'splatter': ['しぶ', 'スプラ', 'とび'],
  'arrow': ['や', 'つるぎ', 'せん'],
  'shield': ['たて', 'よろい', 'かご'],
  'cat': ['ねこ', 'にゃん', '三毛'],
  'bird': ['とり', 'はばた', 'ひば'],
  'fish': ['うお', 'さかな', 'にぎ'],
};

function pickRandom<T>(items: readonly T[], random: () => number): T {
  const idx = Math.min(
    Math.floor(random() * items.length),
    items.length - 1,
  );
  return items[idx]!;
}

function composeRandomName(random: () => number): string {
  const adj = pickRandom(CPU_NAME_ADJECTIVES, random);
  const noun = pickRandom(CPU_NAME_NOUNS, random);
  const template = Math.floor(random() * 3);
  if (template === 0) return `${adj}の${noun}`;
  if (template === 1) return `${adj}${noun}`;
  return `${noun}・${adj}`;
}

function composePatternName(patternId: string, random: () => number): string | null {
  const pool = CPU_PATTERN_NAMES[patternId];
  if (!pool?.length) return null;
  if (random() < 0.35) {
    const adj = pickRandom(CPU_NAME_ADJECTIVES, random);
    return `${adj}の${pickRandom(pool, random)}`;
  }
  return pickRandom(pool, random);
}

/** @deprecated 互換用。generateCpuCardName を推奨 */
export function randomCpuName(random: () => number = Math.random): string {
  return finalizeCardNameForCreation(composeRandomName(random));
}

export function generateCpuCardName(
  patternId: string,
  usedNames: ReadonlySet<string>,
  random: () => number = Math.random,
): string {
  for (let attempt = 0; attempt < 24; attempt++) {
    const usePattern = random() < 0.55;
    const base = usePattern
      ? (composePatternName(patternId, random) ?? composeRandomName(random))
      : composeRandomName(random);
    const epithet =
      attempt === 0 ? '' : pickRandom(CPU_NAME_EPITHETS, random);
    const candidate = finalizeCardNameForCreation(`${base}${epithet}`);
    if (!usedNames.has(candidate)) return candidate;
  }

  const fallback = finalizeCardNameForCreation(
    `${composeRandomName(random)}${pickRandom(CPU_NAME_EPITHETS, random)}`,
  );
  return fallback;
}
