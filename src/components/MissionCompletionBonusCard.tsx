import {
  getCompletionBonusClaimedAt,
  getCompletionBonusDefinition,
  getCompletionBonusProgress,
  isCompletionBonusClaimable,
} from '../mission';
import type {
  CompletionBonusCategory,
  MissionState,
} from '../mission';
import { MissionRewardChips } from './MissionRewardChips';

interface MissionCompletionBonusCardProps {
  category: CompletionBonusCategory;
  missionState: MissionState;
  userLevel: number;
  onClaim: (category: CompletionBonusCategory) => void;
}

const DESCRIPTION: Record<CompletionBonusCategory, string> = {
  daily: '全てのデイリーミッションを達成する',
  weekly: '全てのウィークリーミッションを達成する',
};

export function MissionCompletionBonusCard({
  category,
  missionState,
  userLevel,
  onClaim,
}: MissionCompletionBonusCardProps) {
  const definition = getCompletionBonusDefinition(category);
  const progress = getCompletionBonusProgress(missionState, category, userLevel);
  const claimed = getCompletionBonusClaimedAt(missionState, category) != null;
  const claimable = isCompletionBonusClaimable(
    missionState,
    category,
    userLevel,
  );
  const progressPercent =
    progress.total === 0
      ? 0
      : Math.min(100, Math.round((progress.completed / progress.total) * 100));
  const showProgress = !claimed;

  return (
    <li
      className={[
        'mission-card',
        claimed ? 'mission-card--claimed' : '',
        claimable ? 'mission-card--claimable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={DESCRIPTION[category]}
    >
      <div className="mission-card-top">
        <div className="mission-card-copy">
          <p className="mission-card-description">{DESCRIPTION[category]}</p>
        </div>
        <MissionRewardChips
          reward={definition.reward}
          className="mission-card-rewards"
        />
        <div className="mission-card-action-slot">
          {claimable ? (
            <button
              type="button"
              className="mission-card-claim-btn"
              onClick={() => onClaim(category)}
            >
              受取
            </button>
          ) : claimed ? (
            <span className="mission-card-claimed-btn">受取済</span>
          ) : (
            <span
              className="mission-card-action-placeholder"
              aria-hidden="true"
            >
              受取
            </span>
          )}
        </div>
      </div>

      <div
        className={[
          'mission-card-progress-wrap',
          showProgress ? '' : 'mission-card-progress-wrap--hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!showProgress}
      >
        <div
          className="mission-card-progress"
          role={showProgress ? 'progressbar' : undefined}
          aria-valuenow={showProgress ? progress.completed : undefined}
          aria-valuemin={showProgress ? 0 : undefined}
          aria-valuemax={showProgress ? progress.total : undefined}
          aria-label={
            showProgress
              ? `${progress.completed} / ${progress.total}`
              : undefined
          }
        >
          <div
            className="mission-card-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="mission-card-progress-label">
          {progress.completed} / {progress.total}
        </span>
      </div>
    </li>
  );
}
