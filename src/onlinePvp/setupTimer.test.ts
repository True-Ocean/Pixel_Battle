import { describe, expect, it, vi, afterEach } from 'vitest';
import { computeOnlineSetupSecondsRemaining } from './setupTimer';

describe('computeOnlineSetupSecondsRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('開始直後は制限時間いっぱい', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:00.000Z'));
    expect(
      computeOnlineSetupSecondsRemaining('2026-07-05T04:00:00.000Z', 30),
    ).toBe(30);
  });

  it('経過秒を引く', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:10.000Z'));
    expect(
      computeOnlineSetupSecondsRemaining('2026-07-05T04:00:00.000Z', 30),
    ).toBe(20);
  });

  it('0 未満にならない', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:01:00.000Z'));
    expect(
      computeOnlineSetupSecondsRemaining('2026-07-05T04:00:00.000Z', 30),
    ).toBe(0);
  });
});
