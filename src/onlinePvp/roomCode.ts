import { ONLINE_PVP_ROOM_CODE_LENGTH } from './constants';

/** 全角数字 → 半角、数字以外除去 */
export function normalizeRoomCodeInput(raw: string): string {
  const half = raw.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
  return half.replace(/\D/g, '').slice(0, ONLINE_PVP_ROOM_CODE_LENGTH);
}

/** 6 桁にゼロ埋め（DB の code 列と揃える） */
export function padRoomCode(digits: string): string {
  const normalized = normalizeRoomCodeInput(digits);
  if (normalized.length === 0) return '';
  return normalized.padStart(ONLINE_PVP_ROOM_CODE_LENGTH, '0').slice(
    -ONLINE_PVP_ROOM_CODE_LENGTH,
  );
}

export function generateRoomCode(random: () => number = Math.random): string {
  const max = 10 ** ONLINE_PVP_ROOM_CODE_LENGTH;
  const n = Math.floor(random() * max);
  return n.toString().padStart(ONLINE_PVP_ROOM_CODE_LENGTH, '0');
}

export function isValidRoomCode(code: string): boolean {
  const padded = padRoomCode(code);
  return (
    padded.length === ONLINE_PVP_ROOM_CODE_LENGTH && /^\d+$/.test(padded)
  );
}
