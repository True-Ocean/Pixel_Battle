import { isEmailLinkedUser, getAuthUser } from '../auth';
import type { User } from '@supabase/supabase-js';
import type { SaveData } from '../types';
import {
  ensureLocalClientUpdatedAt,
  readLocalClientUpdatedAt,
  touchLocalClientUpdatedAt,
  writeLocalClientUpdatedAt,
} from './clientUpdatedAt';
import { fetchPlayerSave, upsertPlayerSave } from './playerSave';
import type { CloudSaveFailReason } from './types';

const DEBOUNCE_MS = 3000;

export type SyncDirection = 'upload' | 'download' | 'noop';

export type ReconcileCloudSaveResult =
  | { ok: true; action: 'noop' | 'uploaded' }
  | {
      ok: true;
      action: 'downloaded';
      save: SaveData;
      clientUpdatedAt: string;
    }
  | { ok: false; reason: CloudSaveFailReason; error: string };

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: SaveData | null = null;
let lastCloudSyncAt: string | null = null;
let reconcileInFlight = false;

export function canSyncCloudSave(user: User | null | undefined): boolean {
  return isEmailLinkedUser(user);
}

export function getLastCloudSyncAt(): string | null {
  return lastCloudSyncAt;
}

export function cancelScheduledCloudSaveUpload(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingSave = null;
}

/** ローカルとクラウドのどちらを採用するか（時刻のみ・純粋関数） */
export function pickSyncDirection(
  localAt: string,
  cloudAt: string | null,
): SyncDirection {
  if (cloudAt == null) return 'upload';
  const localTime = Date.parse(localAt);
  const cloudTime = Date.parse(cloudAt);
  if (!Number.isFinite(cloudTime)) return 'upload';
  if (!Number.isFinite(localTime)) return 'download';
  if (cloudTime > localTime) return 'download';
  if (localTime > cloudTime) return 'upload';
  return 'noop';
}

/** クラウド送信用。バトル履歴は端末専用のためキーごと含めない */
export function saveForCloudUpload(save: SaveData): SaveData {
  const { battleHistory: _omit, ...rest } = save;
  return rest;
}

/**
 * クラウド復元時に端末専用フィールドを維持する。
 * バトル履歴は共有不要のためローカル側を優先する。
 */
export function mergeLocalOnlyFields(
  cloudSave: SaveData,
  localSave: SaveData,
): SaveData {
  return {
    ...cloudSave,
    battleHistory: localSave.battleHistory ?? [],
  };
}

/** 進行データがあるか（空クラウドでローカルを潰さない判定用） */
export function hasPlayableProgress(save: SaveData): boolean {
  const user = save.user;
  if (user != null) {
    if (user.level > 1 || user.exp > 0) return true;
    const wins =
      (user.battleWins ?? 0) +
      (user.cpuBattleWins ?? 0) +
      (user.offlinePvpBattleWins ?? 0);
    if (wins > 0) return true;
  }
  const deckCards =
    save.decks?.flat().filter((card): card is NonNullable<typeof card> => card != null) ??
    [];
  if (deckCards.length > 0) return true;
  if ((save.memoryAlbum?.cards?.length ?? 0) > 0) return true;
  return false;
}

/**
 * 時刻に加え、クラウドが実質空ならローカルを優先する。
 * 「認証だけある空アカウントでログイン → 空が復元されて消える」を防ぐ。
 */
export function resolveSyncDirection(options: {
  localAt: string;
  cloudAt: string | null;
  localHasProgress: boolean;
  cloudHasProgress: boolean;
}): SyncDirection {
  const { localAt, cloudAt, localHasProgress, cloudHasProgress } = options;
  if (!cloudHasProgress) {
    return localHasProgress || cloudAt == null ? 'upload' : 'noop';
  }
  if (!localHasProgress) return 'download';
  return pickSyncDirection(localAt, cloudAt);
}

async function uploadSave(
  save: SaveData,
  clientUpdatedAt: string,
): Promise<ReconcileCloudSaveResult> {
  const result = await upsertPlayerSave(
    saveForCloudUpload(save),
    clientUpdatedAt,
  );
  if (!result.ok) {
    return { ok: false, reason: result.reason, error: result.error };
  }
  lastCloudSyncAt = new Date().toISOString();
  return { ok: true, action: 'uploaded' };
}

/**
 * メールアドレス連携済みのとき、ローカルとクラウドを突き合わせる。
 * download の場合は呼び出し側で state に適用すること。
 */
export async function reconcileCloudSave(
  localSave: SaveData,
): Promise<ReconcileCloudSaveResult> {
  const user = await getAuthUser();
  if (!canSyncCloudSave(user)) {
    return { ok: true, action: 'noop' };
  }

  if (reconcileInFlight) {
    return { ok: true, action: 'noop' };
  }
  reconcileInFlight = true;
  try {
    ensureLocalClientUpdatedAt();
    const localAt = readLocalClientUpdatedAt();
    const fetched = await fetchPlayerSave();
    if (!fetched.ok) {
      return { ok: false, reason: fetched.reason, error: fetched.error };
    }

    const cloudAt = fetched.data?.clientUpdatedAt ?? null;
    const cloudSave = fetched.data?.save;
    const direction = resolveSyncDirection({
      localAt,
      cloudAt,
      localHasProgress: hasPlayableProgress(localSave),
      cloudHasProgress: cloudSave != null && hasPlayableProgress(cloudSave),
    });

    if (direction === 'download' && fetched.data) {
      writeLocalClientUpdatedAt(fetched.data.clientUpdatedAt);
      lastCloudSyncAt = new Date().toISOString();
      return {
        ok: true,
        action: 'downloaded',
        save: mergeLocalOnlyFields(fetched.data.save, localSave),
        clientUpdatedAt: fetched.data.clientUpdatedAt,
      };
    }

    if (direction === 'upload') {
      // 空クラウドを上書きするときはローカルを新しい扱いにする
      const uploadAt = hasPlayableProgress(localSave)
        ? touchLocalClientUpdatedAt()
        : localAt;
      return uploadSave(localSave, uploadAt);
    }

    lastCloudSyncAt = new Date().toISOString();
    return { ok: true, action: 'noop' };
  } finally {
    reconcileInFlight = false;
  }
}

/** ローカル保存後に呼ぶ。連携済みなら debounce してクラウドへ upsert */
export function scheduleCloudSaveUpload(save: SaveData): void {
  void getAuthUser().then((user) => {
    if (!canSyncCloudSave(user)) return;
    pendingSave = save;
    if (debounceTimer != null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const toUpload = pendingSave;
      pendingSave = null;
      if (!toUpload) return;
      const clientUpdatedAt = readLocalClientUpdatedAt();
      void uploadSave(toUpload, clientUpdatedAt);
    }, DEBOUNCE_MS);
  });
}

/** 設定の「クラウドに保存」。端末 → クラウドのみ（双方向判定なし） */
export async function uploadCloudSaveNow(
  localSave: SaveData,
): Promise<ReconcileCloudSaveResult> {
  cancelScheduledCloudSaveUpload();
  const user = await getAuthUser();
  if (!canSyncCloudSave(user)) {
    return {
      ok: false,
      reason: 'not_authenticated',
      error: 'メールアドレス連携が必要です',
    };
  }

  ensureLocalClientUpdatedAt();
  const localAt = hasPlayableProgress(localSave)
    ? touchLocalClientUpdatedAt()
    : readLocalClientUpdatedAt();
  return uploadSave(localSave, localAt);
}

/** 設定の「クラウドから復元」。クラウド → 端末のみ（空クラウドは拒否） */
export async function downloadCloudSaveNow(
  localSave: SaveData,
): Promise<ReconcileCloudSaveResult> {
  cancelScheduledCloudSaveUpload();
  const user = await getAuthUser();
  if (!canSyncCloudSave(user)) {
    return {
      ok: false,
      reason: 'not_authenticated',
      error: 'メールアドレス連携が必要です',
    };
  }

  if (reconcileInFlight) {
    return { ok: true, action: 'noop' };
  }
  reconcileInFlight = true;
  try {
    const fetched = await fetchPlayerSave();
    if (!fetched.ok) {
      return { ok: false, reason: fetched.reason, error: fetched.error };
    }
    if (
      fetched.data == null ||
      !hasPlayableProgress(fetched.data.save)
    ) {
      return {
        ok: false,
        reason: 'empty_cloud',
        error: 'クラウドに復元できるデータがありません',
      };
    }

    writeLocalClientUpdatedAt(fetched.data.clientUpdatedAt);
    lastCloudSyncAt = new Date().toISOString();
    return {
      ok: true,
      action: 'downloaded',
      save: mergeLocalOnlyFields(fetched.data.save, localSave),
      clientUpdatedAt: fetched.data.clientUpdatedAt,
    };
  } finally {
    reconcileInFlight = false;
  }
}

/** @deprecated uploadCloudSaveNow / downloadCloudSaveNow を使用 */
export async function syncCloudSaveNow(
  localSave: SaveData,
): Promise<ReconcileCloudSaveResult> {
  cancelScheduledCloudSaveUpload();
  return reconcileCloudSave(localSave);
}
