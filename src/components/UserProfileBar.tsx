import type { UserProfile } from '../types';
import { getLevelProgress } from '../user';

interface UserProfileBarProps {
  user: UserProfile;
}

export function UserProfileBar({ user }: UserProfileBarProps) {
  const { progress, isMaxLevel } = getLevelProgress(user);
  const percent = Math.round(progress * 100);

  return (
    <div className="user-profile-bar" aria-label="ユーザープロフィール">
      <div className="user-profile-row">
        <span className="user-profile-name">{user.username}</span>
        <span className="user-profile-level">Lv.{user.level}</span>
      </div>
      <div
        className={`user-profile-progress${isMaxLevel ? ' is-max' : ''}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          isMaxLevel
            ? `レベル${user.level}（上限）`
            : `レベル${user.level}、次のレベルまで${percent}パーセント`
        }
      >
        <div
          className="user-profile-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
