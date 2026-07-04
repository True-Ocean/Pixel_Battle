import { describe, expect, it } from 'vitest';
import { pickSyncDirection } from './sync';

describe('pickSyncDirection', () => {
  it('uploads when cloud is empty', () => {
    expect(pickSyncDirection('2026-07-04T10:00:00.000Z', null)).toBe('upload');
  });

  it('downloads when cloud is newer', () => {
    expect(
      pickSyncDirection('2026-07-04T10:00:00.000Z', '2026-07-04T12:00:00.000Z'),
    ).toBe('download');
  });

  it('uploads when local is newer', () => {
    expect(
      pickSyncDirection('2026-07-04T12:00:00.000Z', '2026-07-04T10:00:00.000Z'),
    ).toBe('upload');
  });

  it('noops when timestamps match', () => {
    expect(
      pickSyncDirection('2026-07-04T10:00:00.000Z', '2026-07-04T10:00:00.000Z'),
    ).toBe('noop');
  });
});
