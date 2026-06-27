import { describe, expect, it } from 'vitest';
import { generateCpuCardName, randomCpuName } from './cpuNames';

describe('cpuNames', () => {
  it('randomCpuName は空でない名前を返す', () => {
    expect(randomCpuName(() => 0.5).length).toBeGreaterThan(0);
  });

  it('generateCpuCardName はデッキ内で重複しない', () => {
    const used = new Set<string>();
    const names = Array.from({ length: 5 }, (_, index) => {
      const name = generateCpuCardName('cat', used, () => (index + 1) / 10);
      used.add(name);
      return name;
    });
    expect(new Set(names).size).toBe(5);
  });

  it('模様IDに応じた名前を生成しうる', () => {
    let foundPatternish = false;
    for (let i = 0; i < 40; i++) {
      const name = generateCpuCardName('cat', new Set(), () => i / 40);
      if (name.includes('ねこ') || name.includes('にゃん') || name.includes('三毛')) {
        foundPatternish = true;
        break;
      }
    }
    expect(foundPatternish).toBe(true);
  });
});
