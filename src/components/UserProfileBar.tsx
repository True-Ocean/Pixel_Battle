import type { UserProfile } from '../types';
import { getLevelProgress } from '../user';
import { HamburgerMenuIcon } from './HamburgerMenuIcon';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface UserProfileBarProps {
  user: UserProfile;
  /** 所持 px（freePixels） */
  freePixels: number;
  /** 所持ジュエル */
  jewels: number;
  onOpenSettings: () => void;
}

export function UserProfileBar({
  user,
  freePixels,
  jewels,
  onOpenSettings,
}: UserProfileBarProps) {
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
            <span className="user-profile-level-badge-shell" aria-hidden="true">
              <span className="user-profile-level-badge">{user.level}</span>
            </span>
            <div className="user-profile-left-body">
              <span className="user-profile-name">{user.username}</span>
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
              aria-label={`px ${freePixels.toLocaleString()}`}
            >
              <PixelCoinIcon className="user-profile-coin-icon" />
              <span className="user-profile-currency-value">
                {freePixels.toLocaleString()}
              </span>
            </div>
            <div
              className="user-profile-currency-track user-profile-currency-track--jewels"
              role="status"
              aria-label={`ジュエル ${jewels.toLocaleString()}`}
            >
              <JewelIcon className="user-profile-coin-icon user-profile-jewel-icon" />
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
