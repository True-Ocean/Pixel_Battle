import type { UserProfile, UserSubscription } from '../types';
import { getActiveSubscriptionPlan, getLevelProgress } from '../user';
import { HamburgerMenuIcon } from './HamburgerMenuIcon';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface UserProfileBarProps {
  user: UserProfile;
  subscription: UserSubscription;
  /** 所持 px（freePixels） */
  freePixels: number;
  /** 所持ジュエル */
  jewels: number;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function UserProfileBar({
  user,
  subscription,
  freePixels,
  jewels,
  onOpenProfile,
  onOpenSettings,
}: UserProfileBarProps) {
  const activeSubscriptionPlan = getActiveSubscriptionPlan(subscription);
  const subscriptionBadge = activeSubscriptionPlan === 'premium'
    ? { label: 'プレミアムプラン加入中' }
    : activeSubscriptionPlan === 'light'
      ? { label: 'ライトプラン加入中' }
      : null;
  const { progress, isMaxLevel, expInLevel, expToNext } = getLevelProgress(user);
  const percent = Math.round(progress * 100);
  const expInLevelDisplay = Math.max(0, Math.floor(expInLevel));
  const expOnBar = isMaxLevel
    ? 'MAX'
    : `${expInLevelDisplay}/${expToNext}`;

  return (
    <div className="user-profile-header">
      <div className="user-profile-bar" aria-label="ユーザープロフィール">
        <div className="user-profile-main">
          <div className="user-profile-left">
            <span
              className={`user-profile-level-badge-shell user-profile-level-badge-shell--${activeSubscriptionPlan}`}
              aria-hidden="true"
            >
              <span className="user-profile-level-badge">{user.level}</span>
            </span>
            <div className="user-profile-left-body">
              <button
                type="button"
                className="user-profile-name-row"
                aria-label={`${user.username}のプロフィールを開く`}
                onClick={onOpenProfile}
              >
                <span className="user-profile-name">{user.username}</span>
                {subscriptionBadge && (
                  <span
                    className={`user-profile-subscription-badge user-profile-subscription-badge--${activeSubscriptionPlan}`}
                    role="img"
                    aria-label={subscriptionBadge.label}
                    title={subscriptionBadge.label}
                  >
                    <svg
                      className="user-profile-subscription-crown"
                      viewBox="0 0 18 18"
                      aria-hidden="true"
                    >
                      <path
                        className="user-profile-subscription-crown-body"
                        d="M1.5 4.5 5.4 8.2 8.8 1.8 12.2 8.2 16.1 4.5 14.7 14.2H2.9L1.5 4.5Z"
                      />
                      <path
                        className="user-profile-subscription-crown-highlight"
                        d="M4.1 11.8h9.4"
                      />
                    </svg>
                  </span>
                )}
                <span className="user-profile-info-icon" aria-hidden>
                  i
                </span>
              </button>
              <div
                className={`user-profile-progress${isMaxLevel ? ' is-max' : ''}`}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={
                  isMaxLevel
                    ? `レベル${user.level}（上限）、累計${user.exp}EXP`
                    : `レベル${user.level}、${expInLevelDisplay} / ${expToNext} EXP（${percent}パーセント）`
                }
              >
                <div
                  className="user-profile-progress-fill"
                  style={{ width: `${percent}%` }}
                />
                <span className="user-profile-exp-on-bar">{expOnBar}</span>
              </div>
            </div>
          </div>

          <div className="user-profile-currencies" aria-label="所持通貨">
            <div
              className="user-profile-currency-track user-profile-currency-track--pixels"
              role="status"
            >
              <PixelCoinIcon className="user-profile-coin-icon" aria-hidden="true" />
              <span className="sr-only">ピクセルコイン</span>
              <span className="user-profile-currency-value">
                {freePixels.toLocaleString()}
              </span>
            </div>
            <div
              className="user-profile-currency-track user-profile-currency-track--jewels"
              role="status"
            >
              <JewelIcon className="user-profile-coin-icon user-profile-jewel-icon" aria-hidden="true" />
              <span className="sr-only">ジュエル</span>
              <span className="user-profile-currency-value">
                {jewels.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="user-profile-menu-btn"
          aria-label="設定を開く"
          onClick={onOpenSettings}
        >
          <HamburgerMenuIcon className="user-profile-menu-icon" />
        </button>
      </div>
    </div>
  );
}
