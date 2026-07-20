import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  computeOnlinePhaseSecondsRemaining,
  deriveOnlinePhaseTimerDisplay,
  shouldShowOnlinePhaseTimer,
} from './phaseTimer';

describe('computeOnlinePhaseSecondsRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('開始直後は制限時間いっぱい', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:00.000Z'));
    expect(
      computeOnlinePhaseSecondsRemaining('2026-07-05T04:00:00.000Z', 60),
    ).toBe(60);
  });

  it('未開始は null', () => {
    expect(computeOnlinePhaseSecondsRemaining(null, 60)).toBeNull();
  });
});

describe('deriveOnlinePhaseTimerDisplay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('残り31秒は非表示', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:29.000Z'));
    const display = deriveOnlinePhaseTimerDisplay({
      phaseTimerStartedAt: '2026-07-05T04:00:00.000Z',
      battlePhase: 'select',
      inReplay: false,
      waitingForOpponent: false,
      needsOwnPromotion: false,
      waitingOpponentPromotion: false,
    });
    expect(display.zone).toBeNull();
    expect(display.seconds).toBeNull();
  });

  it('自分の選択中はプレイヤー側に表示', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:40.000Z'));
    const display = deriveOnlinePhaseTimerDisplay({
      phaseTimerStartedAt: '2026-07-05T04:00:00.000Z',
      battlePhase: 'select',
      inReplay: false,
      waitingForOpponent: false,
      needsOwnPromotion: false,
      waitingOpponentPromotion: false,
    });
    expect(display.zone).toBe('player');
    expect(display.seconds).toBe(20);
    expect(display.urgent).toBe(false);
  });

  it('相手待ちは相手側に表示し10秒未満は赤字', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:55.000Z'));
    const display = deriveOnlinePhaseTimerDisplay({
      phaseTimerStartedAt: '2026-07-05T04:00:00.000Z',
      battlePhase: 'select',
      inReplay: false,
      waitingForOpponent: true,
      needsOwnPromotion: false,
      waitingOpponentPromotion: false,
    });
    expect(display.zone).toBe('cpu');
    expect(display.seconds).toBe(5);
    expect(display.urgent).toBe(true);
  });

  it('再生中は非表示', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T04:00:55.000Z'));
    const display = deriveOnlinePhaseTimerDisplay({
      phaseTimerStartedAt: '2026-07-05T04:00:00.000Z',
      battlePhase: 'select',
      inReplay: true,
      waitingForOpponent: false,
      needsOwnPromotion: false,
      waitingOpponentPromotion: false,
    });
    expect(display.zone).toBeNull();
  });
});

describe('shouldShowOnlinePhaseTimer', () => {
  it('30秒以下のみ表示', () => {
    expect(shouldShowOnlinePhaseTimer(31)).toBe(false);
    expect(shouldShowOnlinePhaseTimer(30)).toBe(true);
    expect(shouldShowOnlinePhaseTimer(0)).toBe(false);
  });
});
