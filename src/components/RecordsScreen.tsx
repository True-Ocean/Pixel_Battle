import { useEffect, useState } from 'react';
import { DECK_MAX } from '../config/balance';
import type { BattleHistoryEntry } from '../types';
import { BattleHistoryDetailOverlay } from './BattleHistoryDetailOverlay';
import { BattleHistoryList } from './BattleHistoryList';

type RecordsSubTab = 'history' | 'ranking';

interface RecordsScreenProps {
  battleHistory: BattleHistoryEntry[];
  deckCount: number;
  onPracticeRematch: (entry: BattleHistoryEntry) => void;
}

export function RecordsScreen({
  battleHistory,
  deckCount,
  onPracticeRematch,
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
          履歴
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
          deckCount={deckCount}
          onClose={() => setSelectedEntry(null)}
          onPracticeRematch={(entry) => {
            setSelectedEntry(null);
            onPracticeRematch(entry);
          }}
        />
      )}
    </section>
  );
}
