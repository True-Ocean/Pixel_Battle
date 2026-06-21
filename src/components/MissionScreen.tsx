import { useState } from 'react';
import { LevelRewardList } from './LevelRewardList';

type MissionTopTab = 'missions' | 'levelRewards';

interface MissionScreenProps {
  userLevel: number;
}

export function MissionScreen({ userLevel }: MissionScreenProps) {
  const [topTab, setTopTab] = useState<MissionTopTab>('missions');

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
        <div className="mission-list-placeholder">
          <p className="muted">ミッション機能は準備中です</p>
        </div>
      ) : (
        <LevelRewardList userLevel={userLevel} />
      )}
    </section>
  );
}
