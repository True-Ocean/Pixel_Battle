import type { SaveData } from '../types';

export type CloudSaveFailReason =
  | 'not_configured'
  | 'not_authenticated'
  | 'fetch_failed'
  | 'upsert_failed'
  | 'invalid_save';

export type CloudSaveResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: CloudSaveFailReason; error: string };

/** クラウド上のセーブ1件（行が無いときは fetch の data が null） */
export type PlayerSaveSnapshot = {
  save: SaveData;
  /** 端末が付けた最終更新時刻（ISO 8601） */
  clientUpdatedAt: string;
  /** サーバーが付けた更新時刻（ISO 8601） */
  updatedAt: string;
};
