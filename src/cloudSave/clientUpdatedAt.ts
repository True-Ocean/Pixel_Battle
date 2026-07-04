const CLIENT_UPDATED_KEY = 'dot5-battle-client-updated-at';
/** storage/index.ts の STORAGE_KEY と同じ */
const SAVE_STORAGE_KEY = 'dot5-battle-save-v1';

const EPOCH_ISO = new Date(0).toISOString();

export function readLocalClientUpdatedAt(): string {
  if (typeof localStorage === 'undefined') return EPOCH_ISO;
  const raw = localStorage.getItem(CLIENT_UPDATED_KEY);
  return raw && raw.length > 0 ? raw : EPOCH_ISO;
}

export function writeLocalClientUpdatedAt(iso: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CLIENT_UPDATED_KEY, iso);
}

/** ローカル保存のたびに呼ぶ。新しい ISO 時刻を返す */
export function touchLocalClientUpdatedAt(iso?: string): string {
  const at = iso ?? new Date().toISOString();
  writeLocalClientUpdatedAt(at);
  return at;
}

/**
 * タイムスタンプ未設定時の初期化。
 * - プレイデータあり: 「今」を書きローカルを保護
 * - 新規・未プレイ: epoch のまま（クラウドがあればダウンロード優先）
 */
export function ensureLocalClientUpdatedAt(): string {
  if (typeof localStorage === 'undefined') return EPOCH_ISO;
  const raw = localStorage.getItem(CLIENT_UPDATED_KEY);
  if (raw && raw.length > 0) return raw;

  const saveRaw = localStorage.getItem(SAVE_STORAGE_KEY);
  if (!saveRaw) return EPOCH_ISO;
  try {
    const parsed = JSON.parse(saveRaw) as { user?: unknown };
    if (parsed.user == null) return EPOCH_ISO;
  } catch {
    return EPOCH_ISO;
  }
  return touchLocalClientUpdatedAt();
}
