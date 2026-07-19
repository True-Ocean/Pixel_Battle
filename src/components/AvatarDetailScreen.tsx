import { useState } from 'react';
import type { SubscriptionPlan, UserProfile, UserSubscription } from '../types';
import { getActiveSubscriptionPlan } from '../user';
import { ConfirmDialog } from './ConfirmDialog';
import { PixelIconPreview } from './PixelIconPreview';

export type AvatarDetailUser = Pick<UserProfile, 'username' | 'avatar'> & {
  subscriptionPlan?: SubscriptionPlan;
};

interface AvatarDetailScreenProps {
  user: AvatarDetailUser;
  /** 自分のプロフィールでのみ指定する。 */
  subscription?: UserSubscription;
  onBack: () => void;
  /** 省略時は閲覧専用 */
  onEdit?: () => void;
  /** 省略時は削除操作を表示しない */
  onDelete?: () => void;
}

const AVATAR_DETAIL_PREVIEW_SIZE = 256;

export function AvatarDetailScreen({
  user,
  subscription,
  onBack,
  onEdit,
  onDelete,
}: AvatarDetailScreenProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const initialChar = user.username.trim().charAt(0) || '?';
  const hasAvatar = user.avatar != null;
  const canDelete = hasAvatar && onDelete != null;
  const activePlan = subscription
    ? getActiveSubscriptionPlan(subscription)
    : (user.subscriptionPlan ?? 'none');

  return (
    <section className="screen avatar-detail-screen">
      <header className="avatar-detail-header">
        <button type="button" className="avatar-detail-back-btn" onClick={onBack}>
          戻る
        </button>
        <h1 className="avatar-detail-title">アバター</h1>
      </header>

      <div className="avatar-detail-body">
        <div
          className={`avatar-detail-frame avatar-detail-frame--${activePlan}`}
          aria-hidden
        >
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
        <div className="avatar-detail-identity">
          <p className="avatar-detail-name">{user.username}</p>
          {activePlan !== 'none' && (
            <span
              className={`avatar-detail-subscription-crown avatar-detail-subscription-crown--${activePlan}`}
              role="img"
              aria-label={
                activePlan === 'premium' ? 'プレミアムプラン' : 'ライトプラン'
              }
              title={
                activePlan === 'premium' ? 'プレミアムプラン' : 'ライトプラン'
              }
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path
                  className="avatar-detail-subscription-crown-body"
                  d="M1.5 4.5 5.4 8.2 8.8 1.8 12.2 8.2 16.1 4.5 14.7 14.2H2.9L1.5 4.5Z"
                />
                <path
                  className="avatar-detail-subscription-crown-highlight"
                  d="M4.1 11.8h9.4"
                />
              </svg>
            </span>
          )}
        </div>

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
