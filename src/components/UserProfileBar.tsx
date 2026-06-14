import type { UserProfile } from '../types';
import { getLevelProgress } from '../user';

interface UserProfileBarProps {
  user: UserProfile;
  /** 所持無償ピクセル */
  freePixels?: number;
}

export function UserProfileBar({ user, freePixels }: UserProfileBarProps) {
  const { progress, isMaxLevel, expInLevel, expToNext } = getLevelProgress(user);
  const percent = Math.round(progress * 100);
  const expInLevelDisplay = Math.max(0, Math.floor(expInLevel));
  const expLabel = isMaxLevel
    ? `${user.exp.toLocaleString()} EXP`
    : `${expInLevelDisplay} / ${expToNext} EXP`;

  return (
    <div className="user-profile-bar" aria-label="ユーザープロフィール">
      <div className="user-profile-row">
        <span className="user-profile-name">{user.username}</span>
        <div className="user-profile-stats">
          <span className="user-profile-level">Lv.{user.level}</span>
          {typeof freePixels === 'number' && (
            <span className="user-profile-pixels" aria-label={`無償ピクセル${freePixels}`}>
              {freePixels.toLocaleString()}px
            </span>
          )}
          <span className="user-profile-battle-record">
            {user.battleWins}勝{user.battleLosses}敗
          </span>
        </div>
      </div>
      <div className="user-profile-progress-wrap">
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
        </div>
        <div className="user-profile-exp-row">
          <span className="user-profile-exp-label">{expLabel}</span>
        </div>
      </div>
    </div>
  );
}
