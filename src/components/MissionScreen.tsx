import { useEffect, useMemo, useState } from 'react';
import type { MissionCategory, MissionState } from '../mission/types';
import {
  countUnclaimedMissions,
  listClaimableMissionsInCategory,
  shouldShowBeginnerMissions,
} from '../mission';
import { LevelRewardList } from './LevelRewardList';
import { MissionBulkClaimModal } from './MissionBulkClaimModal';
import { MissionListPanel } from './MissionListPanel';

type MissionTopTab = 'missions' | 'levelRewards';

type MissionCategoryTab = MissionCategory;

interface MissionClaimSummary {
  pxGranted: number;
  jewelsGranted: number;
  universalShardsGranted: number;
  missionCount: number;
}

interface MissionScreenProps {
  userLevel: number;
  missionState: MissionState;
  onClaimMission: (missionId: string) => void;
  onClaimCategoryMissions: (category: MissionCategory) => MissionClaimSummary | null;
  onChallengeMission: (missionId: string) => void;
}

function defaultCategoryTab(missionState: MissionState): MissionCategoryTab {
  return shouldShowBeginnerMissions(missionState) ? 'beginner' : 'daily';
}

export function MissionScreen({
  userLevel,
  missionState,
  onClaimMission,
  onClaimCategoryMissions,
  onChallengeMission,
}: MissionScreenProps) {
  const [topTab, setTopTab] = useState<MissionTopTab>('missions');
  const showBeginner = shouldShowBeginnerMissions(missionState);
  const [categoryTab, setCategoryTab] = useState<MissionCategoryTab>(() =>
    defaultCategoryTab(missionState),
  );
  const [bulkClaimSummary, setBulkClaimSummary] = useState<MissionClaimSummary | null>(
    null,
  );

  const unclaimedCount = useMemo(
    () => countUnclaimedMissions(missionState, userLevel),
    [missionState, userLevel],
  );
  const unclaimedByCategory = useMemo(
    () => ({
      beginner: listClaimableMissionsInCategory(missionState, 'beginner', userLevel)
        .length,
      daily: listClaimableMissionsInCategory(missionState, 'daily', userLevel).length,
      weekly: listClaimableMissionsInCategory(missionState, 'weekly', userLevel).length,
      permanent: listClaimableMissionsInCategory(missionState, 'permanent', userLevel)
        .length,
    }),
    [missionState, userLevel],
  );

  useEffect(() => {
    if (categoryTab === 'beginner' && !showBeginner) {
      setCategoryTab('daily');
    }
  }, [categoryTab, showBeginner]);

  const handleBulkClaim = (category: MissionCategory) => {
    const summary = onClaimCategoryMissions(category);
    if (summary) setBulkClaimSummary(summary);
  };

  const categoryTabs: { id: MissionCategoryTab; label: string }[] = showBeginner
    ? [
        { id: 'beginner', label: 'ビギナー' },
        { id: 'daily', label: 'デイリー' },
        { id: 'weekly', label: 'ウィークリー' },
        { id: 'permanent', label: '常設' },
      ]
    : [
        { id: 'daily', label: 'デイリー' },
        { id: 'weekly', label: 'ウィークリー' },
        { id: 'permanent', label: '常設' },
      ];

  return (
    <section className="screen screen-mission">
      <div className="mission-subtabs" role="tablist" aria-label="ミッション">
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'missions'}
          className={`mission-subtab${topTab === 'missions' ? ' is-active' : ''}`}
          onClick={() => setTopTab('missions')}
        >
          ミッション
          {unclaimedCount > 0 && topTab !== 'missions' && (
            <span className="mission-tab-badge" aria-label={`未受取${unclaimedCount}件`}>
              {unclaimedCount > 9 ? '9+' : unclaimedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'levelRewards'}
          className={`mission-subtab${topTab === 'levelRewards' ? ' is-active' : ''}`}
          onClick={() => setTopTab('levelRewards')}
        >
          レベル報酬
        </button>
      </div>

      {topTab === 'missions' ? (
        <div className="mission-list-shell">
          <div
            className={`mission-category-subtabs${
              categoryTabs.length >= 4 ? ' mission-category-subtabs--compact' : ''
            }`}
            role="tablist"
            aria-label="ミッション種別"
          >
            {categoryTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={categoryTab === id}
                className={`mission-category-subtab${
                  categoryTab === id ? ' is-active' : ''
                }`}
                onClick={() => setCategoryTab(id)}
              >
                {label}
                {unclaimedByCategory[id] > 0 && (
                  <span
                    className="mission-tab-badge"
                    aria-label={`未受取${unclaimedByCategory[id]}件`}
                  >
                    {unclaimedByCategory[id] > 9 ? '9+' : unclaimedByCategory[id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mission-list-scroll">
            <MissionListPanel
              category={categoryTab}
              missionState={missionState}
              userLevel={userLevel}
              onClaim={onClaimMission}
              onBulkClaim={handleBulkClaim}
              onChallenge={onChallengeMission}
            />
          </div>
        </div>
      ) : (
        <LevelRewardList userLevel={userLevel} />
      )}

      {bulkClaimSummary && (
        <MissionBulkClaimModal
          pxGranted={bulkClaimSummary.pxGranted}
          jewelsGranted={bulkClaimSummary.jewelsGranted}
          universalShardsGranted={bulkClaimSummary.universalShardsGranted}
          missionCount={bulkClaimSummary.missionCount}
          onClose={() => setBulkClaimSummary(null)}
        />
      )}
    </section>
  );
}
