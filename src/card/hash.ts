/** 決定論的 hash → [0, 1) （ブラウザ・Node 両対応の同期実装） */

export function hashToUnit(seed: string, label: string): number {
  let h = 2166136261;
  const s = `${seed}\0${label}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0x1_0000_0000;
}

export function buildCardSeed(name: string, pixels: import('../types').PixelGrid): string {
  const body = pixels
    .map((row) => row.map((c) => (c ?? '.').toLowerCase()).join(''))
    .join('|');
  return `${name.trim()}\n${body}`;
}
