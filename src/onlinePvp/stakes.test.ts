import { describe, expect, it } from 'vitest';
import {
  applyOnlinePvpWalletTransfer,
  calcOnlinePvpBattleTransfer,
  canContinueOnlinePvpSession,
  clampOnlinePvpWalletTransfer,
} from './stakes';
import { generateRoomCode, isValidRoomCode, normalizeRoomCodeInput, padRoomCode } from './roomCode';

describe('onlinePvp stakes', () => {
  it('calcOnlinePvpBattleTransfer', () => {
    expect(calcOnlinePvpBattleTransfer(1)).toBe(20);
    expect(calcOnlinePvpBattleTransfer(3)).toBe(60);
    expect(calcOnlinePvpBattleTransfer(5)).toBe(100);
    expect(calcOnlinePvpBattleTransfer(99)).toBe(100);
  });

  it('canContinueOnlinePvpSession', () => {
    expect(canContinueOnlinePvpSession(100)).toBe(true);
    expect(canContinueOnlinePvpSession(99)).toBe(false);
  });

  it('clampOnlinePvpWalletTransfer', () => {
    expect(clampOnlinePvpWalletTransfer(100, 80)).toBe(80);
    expect(clampOnlinePvpWalletTransfer(60, 500)).toBe(60);
  });

  it('applyOnlinePvpWalletTransfer', () => {
    expect(applyOnlinePvpWalletTransfer(150, true, 60)).toEqual({
      nextWalletPx: 210,
      applied: 60,
    });
    expect(applyOnlinePvpWalletTransfer(150, false, 60)).toEqual({
      nextWalletPx: 90,
      applied: 60,
    });
    expect(applyOnlinePvpWalletTransfer(40, false, 60)).toEqual({
      nextWalletPx: 0,
      applied: 40,
    });
  });
});

describe('roomCode', () => {
  it('generateRoomCode length', () => {
    expect(generateRoomCode(() => 0)).toHaveLength(6);
  });

  it('normalizeRoomCodeInput and padRoomCode', () => {
    expect(normalizeRoomCodeInput('12ab34')).toBe('1234');
    expect(padRoomCode('1234')).toBe('001234');
    expect(isValidRoomCode('123456')).toBe(true);
    expect(isValidRoomCode('12345')).toBe(true);
    expect(normalizeRoomCodeInput('１２３４５６')).toBe('123456');
  });
});
