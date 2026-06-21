import { getMissionsByCategory } from '../config/missions';
import { listClaimableMissionsInCategory } from '../mission';
import type { MissionCategory, MissionState } from '../mission/types';
import { MissionCard } from './MissionCard';

interface MissionListPanelProps {
  category: MissionCategory;
  missionState: MissionState;
  onClaim: (missionId: string) => void;
  onBulkClaim: (category: MissionCategory) => void;
  onChallenge: (missionId: string) => void;
}

export function MissionListPanel({
  category,
  missionState,
  onClaim,
  onBulkClaim,
  onChallenge,
}: MissionListPanelProps) {
  const missions = getMissionsByCategory(category);
  const claimableCount = listClaimableMissionsInCategory(missionState, category).length;

  if (missions.length === 0) {
    return (
      <div className="mission-list-empty">
        <p className="muted">ミッションはありません</p>
      </div>
    );
  }

  return (
    <div className="mission-list-panel">
      <div className="mission-list-bulk-row">
        <button
          type="button"
          className="mission-bulk-claim-btn"
          disabled={claimableCount === 0}
          onClick={() => onBulkClaim(category)}
        >
          一括受取
          {claimableCount > 0 && (
            <span className="mission-bulk-claim-count">{claimableCount}</span>
          )}
        </button>
      </div>
      <ul className="mission-card-list" aria-label="ミッション一覧">
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
