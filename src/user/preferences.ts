/** 未設定時はオン（true） */
export function normalizeSoundEnabled(value: unknown): boolean {
  return value !== false;
}
