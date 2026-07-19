import { describe, expect, it } from 'vitest';
import {
  finalizeProfileComment,
  PROFILE_COMMENT_MAX_LENGTH,
  sanitizeProfileCommentInput,
} from './profileComment';

describe('profileComment', () => {
  it('前後空白を除去し、空なら未設定にする', () => {
    expect(finalizeProfileComment('  よろしく！  ')).toBe('よろしく！');
    expect(finalizeProfileComment(' \n ')).toBeUndefined();
  });

  it('3行までに制限する', () => {
    expect(sanitizeProfileCommentInput('1\n2\n3\n4')).toBe('1\n2\n3');
  });

  it('Unicodeコードポイントで50文字までに制限する', () => {
    const result = sanitizeProfileCommentInput(
      '😀'.repeat(PROFILE_COMMENT_MAX_LENGTH + 1),
    );
    expect(Array.from(result)).toHaveLength(PROFILE_COMMENT_MAX_LENGTH);
  });
});
