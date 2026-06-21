import { describe, expect, it } from 'vitest';
import { formatMissionCompleteToastMessage } from './toast';

describe('formatMissionCompleteToastMessage', () => {
  it('returns null for empty list', () => {
    expect(formatMissionCompleteToastMessage([])).toBeNull();
  });

  it('uses single-mission copy', () => {
    expect(
      formatMissionCompleteToastMessage([{ title: 'ログイン' }]),
    ).toBe('ミッション達成！報酬を受け取ろう');
  });

  it('uses count copy for multiple missions', () => {
    expect(
      formatMissionCompleteToastMessage([
        { title: 'ログイン' },
        { title: 'バトルで1勝' },
      ]),
    ).toBe('2件のミッション達成！報酬を受け取ろう');
  });
});
