import { useState } from 'react';
import type { UserProfile } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { PixelIconPreview } from './PixelIconPreview';

export type AvatarDetailUser = Pick<UserProfile, 'username' | 'avatar'>;

interface AvatarDetailScreenProps {
  user: AvatarDetailUser;
  onBack: () => void;
  /** 省略時は閲覧専用 */
  onEdit?: () => void;
  /** 省略時は削除操作を表示しない */
  onDelete?: () => void;
}

const AVATAR_DETAIL_PREVIEW_SIZE = 256;

export function AvatarDetailScreen({
  user,
  onBack,
  onEdit,
  onDelete,
}: AvatarDetailScreenProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const initialChar = user.username.trim().charAt(0) || '?';
  const hasAvatar = user.avatar != null;
  const canDelete = hasAvatar && onDelete != null;

  return (
    <section className="screen avatar-detail-screen">
      <header className="avatar-detail-header">
        <button type="button" className="avatar-detail-back-btn" onClick={onBack}>
          戻る
        </button>
        <h1 className="avatar-detail-title">アバター</h1>
      </header>

      <div className="avatar-detail-body">
        <div className="avatar-detail-frame" aria-hidden>
          {user.avatar ? (
            <PixelIconPreview
              className="avatar-detail-preview"
              pixels={user.avatar.pixels}
              size={AVATAR_DETAIL_PREVIEW_SIZE}
            />
          ) : (
            <span className="avatar-detail-initial">{initialChar}</span>
          )}
        </div>
        <p className="avatar-detail-name">{user.username}</p>

        {onEdit && (
          <div className="avatar-detail-actions">
            <button
              type="button"
              className="avatar-detail-edit-btn"
              onClick={onEdit}
            >
              {hasAvatar ? 'アバターを編集' : 'アバターを編集'}
            </button>
            {canDelete && (
              <button
                type="button"
                className="avatar-detail-delete-btn"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                アバターを削除
              </button>
            )}
          </div>
        )}
      </div>

      {canDelete && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          title="アバターを削除"
          message="アバターを削除しますか？この操作は取り消せません。"
          confirmLabel="削除"
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            onDelete();
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </section>
  );
}
