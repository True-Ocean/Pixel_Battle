import { MAX_USER_LEVEL } from '../config/balance';
import type { LevelUpRewardKind } from '../config/progressionUnlocks';
import { getLevelUpRewardsAtLevel } from '../config/progressionUnlocks';
import { LevelUpRewardIcon } from './LevelUpRewardIcon';

interface LevelRewardListProps {
  userLevel: number;
}

const LEVELS = Array.from(
  { length: MAX_USER_LEVEL - 1 },
  (_, index) => index + 2,
);

const HIDDEN_REWARD_KINDS = new Set<LevelUpRewardKind>([
  'lost_unlock',
  'lost_encouragement',
]);

export function LevelRewardList({ userLevel }: LevelRewardListProps) {
  return (
    <ul className="level-reward-list" aria-label="レベル報酬一覧">
      {LEVELS.map((level) => {
        const isEarned = level <= userLevel;
        const rewards = getLevelUpRewardsAtLevel(level).filter(
          (reward) => !HIDDEN_REWARD_KINDS.has(reward.kind),
        );

        return (
          <li
            key={level}
            className={`level-reward-row${isEarned ? ' is-earned' : ''}`}
            aria-label={`レベル${level}${isEarned ? ' 獲得済み' : ''}`}
          >
            <span className="level-reward-level">Lv.{level}</span>
            <div className="level-reward-icons">
              {rewards.map((reward) => (
                <LevelUpRewardIcon
                  key={`${level}-${reward.kind}-${reward.attribute ?? ''}-${reward.paletteIndex ?? ''}-${reward.label}`}
                  reward={reward}
                  level={level}
                />
              ))}
            </div>
            <span
              className="level-reward-earned-mark"
              aria-hidden={!isEarned}
            >
              {isEarned ? '✓' : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
