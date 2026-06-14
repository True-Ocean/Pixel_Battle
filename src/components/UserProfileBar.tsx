import type { UserProfile } from '../types';
import { getLevelProgress } from '../user';
import { PixelCoinIcon } from './PixelCoinIcon';

interface UserProfileBarProps {
  user: UserProfile;
  /** 所持無償ピクセル */
  freePixels: number;
}

export function UserProfileBar({ user, freePixels }: UserProfileBarProps) {
  const { progress, isMaxLevel, expInLevel, expToNext } = getLevelProgress(user);
  const percent = Math.round(progress * 100);
  const expInLevelDisplay = Math.max(0, Math.floor(expInLevel));
  const expOnBar = isMaxLevel
    ? 'MAX'
    : `${expInLevelDisplay}/${expToNext}`;

  return (
    <div className="user-profile-bar" aria-label="ユーザープロフィール">
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

      <div
        className="user-profile-currency-track"
        role="status"
        aria-label={`無償ピクセル ${freePixels.toLocaleString()}`}
      >
        <PixelCoinIcon className="user-profile-coin-icon" />
        <span className="user-profile-currency-value">
          {freePixels.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
