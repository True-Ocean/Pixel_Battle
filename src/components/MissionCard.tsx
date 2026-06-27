import type { MissionDefinition } from '../mission/types';
import { canShowMissionChallenge } from '../mission/navigation';
import {
  getMissionProgress,
  isMissionClaimable,
  isMissionClaimed,
  isMissionCompleted,
} from '../mission/progress';
import type { MissionState } from '../mission/types';
import { MissionRewardChips } from './MissionRewardChips';

interface MissionCardProps {
  mission: MissionDefinition;
  missionState: MissionState;
  onClaim: (missionId: string) => void;
  onChallenge: (missionId: string) => void;
}

export function MissionCard({
  mission,
  missionState,
  onClaim,
  onChallenge,
}: MissionCardProps) {
  const entry = getMissionProgress(missionState, mission);
  const claimed = isMissionClaimed(missionState, mission);
  const claimable = isMissionClaimable(missionState, mission);
  const completed = isMissionCompleted(missionState, mission);
  const progressPercent = Math.min(
    100,
    Math.round((entry.progress / mission.goal) * 100),
  );
  const showProgress = !claimed;
  const showChallenge =
    !claimed &&
    !claimable &&
    !completed &&
    canShowMissionChallenge(mission.eventType);

  return (
    <li
      className={[
        'mission-card',
        claimed ? 'mission-card--claimed' : '',
        claimable ? 'mission-card--claimable' : '',
        showChallenge ? 'mission-card--challengeable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={mission.title}
    >
      <div className="mission-card-top">
        <div className="mission-card-copy">
          <p className="mission-card-description">{mission.description}</p>
        </div>
        <MissionRewardChips reward={mission.reward} className="mission-card-rewards" />
        <div className="mission-card-action-slot">
          {claimable ? (
            <button
              type="button"
              className="mission-card-claim-btn"
              onClick={() => onClaim(mission.id)}
            >
              受取
            </button>
          ) : claimed ? (
            <span className="mission-card-claimed-btn">受取済</span>
          ) : showChallenge ? (
            <button
              type="button"
              className="mission-card-challenge-btn"
              onClick={() => onChallenge(mission.id)}
            >
              挑戦
            </button>
          ) : (
            <span className="mission-card-action-placeholder" aria-hidden="true">
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
          aria-valuenow={showProgress ? entry.progress : undefined}
          aria-valuemin={showProgress ? 0 : undefined}
          aria-valuemax={showProgress ? mission.goal : undefined}
          aria-label={
            showProgress ? `${entry.progress} / ${mission.goal}` : undefined
          }
        >
          <div
            className="mission-card-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="mission-card-progress-label">
          {Math.min(entry.progress, mission.goal)} / {mission.goal}
        </span>
      </div>
    </li>
  );
}
