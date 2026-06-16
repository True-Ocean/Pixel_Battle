import { useState } from 'react';
import type { BattleHistoryEntry } from '../types';
import { BattleHistoryDetailOverlay } from './BattleHistoryDetailOverlay';
import { BattleHistoryList } from './BattleHistoryList';

type RecordsSubTab = 'history' | 'ranking';

interface RecordsScreenProps {
  battleHistory: BattleHistoryEntry[];
  canRematch: boolean;
  onRequestRematch: (entry: BattleHistoryEntry) => void;
}

export function RecordsScreen({
  battleHistory,
  canRematch,
  onRequestRematch,
}: RecordsScreenProps) {
  const [subTab, setSubTab] = useState<RecordsSubTab>('history');
  const [selectedEntry, setSelectedEntry] = useState<BattleHistoryEntry | null>(null);

  return (
    <section className="screen screen-records">
      <div className="records-subtabs" role="tablist" aria-label="戦績">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'history'}
          className={`records-subtab${subTab === 'history' ? ' is-active' : ''}`}
          onClick={() => setSubTab('history')}
        >
          バトル履歴
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'ranking'}
          className={`records-subtab${subTab === 'ranking' ? ' is-active' : ''}`}
          onClick={() => setSubTab('ranking')}
        >
          ランキング
        </button>
      </div>

      {subTab === 'history' ? (
        <BattleHistoryList
          entries={battleHistory}
          onSelect={setSelectedEntry}
        />
      ) : (
        <div className="records-ranking-placeholder">
          <h2 className="records-ranking-title">ランキング</h2>
          <p className="muted">戦力・勝率・いいね数などのランキングは準備中です</p>
        </div>
      )}

      {selectedEntry && (
        <BattleHistoryDetailOverlay
          entry={selectedEntry}
          canRematch={canRematch}
          onClose={() => setSelectedEntry(null)}
          onRematch={(entry) => {
            setSelectedEntry(null);
            onRequestRematch(entry);
          }}
        />
      )}
    </section>
  );
}
