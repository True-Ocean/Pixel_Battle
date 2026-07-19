export const DEFAULT_PROFILE_COMMENT = 'よろしくお願いします';
export const PROFILE_COMMENT_MAX_LENGTH = 50;
export const PROFILE_COMMENT_MAX_LINES = 3;

function truncateByCodePoints(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join('');
}

/** 入力中: 改行コードと行数・文字数を表示可能な範囲へ収める。 */
export function sanitizeProfileCommentInput(raw: string): string {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const limitedLines = normalized
    .split('\n')
    .slice(0, PROFILE_COMMENT_MAX_LINES)
    .join('\n');
  return truncateByCodePoints(limitedLines, PROFILE_COMMENT_MAX_LENGTH);
}

/** 保存時: 前後空白を除去し、空なら未設定に戻す。 */
export function finalizeProfileComment(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return sanitizeProfileCommentInput(trimmed);
}

export function profileCommentLength(value: string): number {
  return Array.from(value).length;
}
