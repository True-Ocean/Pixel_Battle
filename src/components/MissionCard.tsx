import type { MissionDefinition } from '../mission/types';
import { canShowMissionChallenge } from '../mission/navigation';
import { getBeginnerMissions } from '../config/missions';
import {
  getMissionProgress,
  isBeginnerMissionLocked,
  isCurrentBeginnerMission,
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
  const isBeginner = mission.category === 'beginner';
  const locked = isBeginnerMissionLocked(missionState, mission);
  const claimed = isMissionClaimed(missionState, mission);
  const claimable = isMissionClaimable(missionState, mission);
  const completed = isMissionCompleted(missionState, mission);
  const isCurrent =
    isBeginner && isCurrentBeginnerMission(missionState, mission);
  const progressPercent = Math.min(100, Math.round((entry.progress / mission.goal) * 100));
  const showProgress = !claimed && !locked;
  const showChallenge =
    !locked &&
    !claimed &&
    !claimable &&
    !completed &&
    canShowMissionChallenge(mission.eventType) &&
    (!isBeginner || isCurrent);
  const stepLabel =
    isBeginner && mission.order != null
      ? `STEP ${mission.order}/${getBeginnerMissions().length}`
      : null;

  return (
    <li
      className={[
        'mission-card',
        locked ? 'mission-card--locked' : '',
        claimed ? 'mission-card--claimed' : '',
        claimable ? 'mission-card--claimable' : '',
        isCurrent ? 'mission-card--current' : '',
        showChallenge ? 'mission-card--challengeable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mission-card-top">
        <div className="mission-card-copy">
          {stepLabel && <p className="mission-card-step">{stepLabel}</p>}
          <h3 className="mission-card-title">{mission.title}</h3>
          <p className="mission-card-description muted">{mission.description}</p>
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

      {showProgress && (
        <div className="mission-card-progress-wrap">
          <div
            className="mission-card-progress"
            role="progressbar"
            aria-valuenow={entry.progress}
            aria-valuemin={0}
            aria-valuemax={mission.goal}
            aria-label={`${entry.progress} / ${mission.goal}`}
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
      )}
      {locked && <p className="mission-card-locked-label muted">未解放</p>}
      {isCurrent && !claimable && !claimed && !locked && (
        <p className="mission-card-current-label">いま挑戦中</p>
      )}
      {completed && !claimed && !locked && (
        <p className="mission-card-complete-label">達成！</p>
      )}
    </li>
  );
}
