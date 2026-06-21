/** 未設定時はオフ（false）。明示的に true のときのみオン */
export function normalizeSoundEnabled(value: unknown): boolean {
  return value === true;
}
