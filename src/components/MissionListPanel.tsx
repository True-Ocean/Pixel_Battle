import { getBeginnerMissions, getMissionsByCategory } from '../config/missions';
import {
  isMissionClaimed,
  listClaimableMissionsInCategory,
  sortMissionsForDisplay,
} from '../mission';
import type { MissionCategory, MissionState } from '../mission/types';
import { MissionCard } from './MissionCard';

interface MissionListPanelProps {
  category: MissionCategory;
  missionState: MissionState;
  userLevel: number;
  onClaim: (missionId: string) => void;
  onBulkClaim: (category: MissionCategory) => void;
  onChallenge: (missionId: string) => void;
}

export function MissionListPanel({
  category,
  missionState,
  userLevel,
  onClaim,
  onBulkClaim,
  onChallenge,
}: MissionListPanelProps) {
  const missions = sortMissionsForDisplay(
    category === 'beginner'
      ? getBeginnerMissions()
      : getMissionsByCategory(category, missionState, userLevel),
    missionState,
    category,
  );
  const reorderCompleted = category !== 'beginner';
  const claimableCount = listClaimableMissionsInCategory(
    missionState,
    category,
    userLevel,
  ).length;
  const beginnerClaimedCount =
    category === 'beginner'
      ? missions.filter((mission) => isMissionClaimed(missionState, mission)).length
      : 0;

  if (missions.length === 0) {
    return (
      <div className="mission-list-empty">
        <p className="muted">
          {category === 'permanent'
            ? 'すべての常設ミッションを達成しました'
            : 'ミッションはありません'}
        </p>
      </div>
    );
  }

  return (
    <div className="mission-list-panel">
      {category === 'beginner' && (
        <div className="mission-beginner-intro">
          <p className="mission-beginner-intro-text">
            順番に挑戦してクリアしよう
          </p>
          <p className="mission-beginner-intro-meta muted">
            {beginnerClaimedCount} / {missions.length} 受取済み
          </p>
        </div>
      )}
      <div className="mission-list-bulk-row">
        <button
          type="button"
          className="mission-bulk-claim-btn"
          disabled={claimableCount === 0}
          onClick={() => onBulkClaim(category)}
        >
          一括受取
        </button>
      </div>
      <ul
        className={[
          'mission-card-list',
          reorderCompleted ? 'mission-card-list--reorder-completed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="ミッション一覧"
      >
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            missionState={missionState}
            onClaim={onClaim}
            onChallenge={onChallenge}
          />
        ))}
      </ul>
    </div>
  );
}
