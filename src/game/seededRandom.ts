import type { BattleActionChoice } from '../types/battle';

/** オンライン対戦などで両端末が同じ乱数列を使うための PRNG */
export function createSeededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 嵐などターン解決用。host 視点の turn と選択を固定順でシード化 */
export function buildOnlineTurnRandomSeed(
  roomId: string,
  turn: number,
  hostChoice: BattleActionChoice,
  guestChoice: BattleActionChoice,
): string {
  return `${roomId}:${turn}:${JSON.stringify(hostChoice)}:${JSON.stringify(guestChoice)}`;
}

/** 前衛補充の自動選択用（両端末・サーバーで同じ結果） */
export function buildOnlinePromotionRandomSeed(
  roomId: string,
  turn: number,
  revision: number,
  label: string,
): string {
  return `${roomId}:${turn}:${revision}:${label}`;
}
