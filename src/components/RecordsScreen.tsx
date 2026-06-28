import { useState } from 'react';
import { getBattleHistoryHelp } from '../config/helpContent';
import type { BattleHistoryEntry } from '../types';
import { BattleHistoryDetailOverlay } from './BattleHistoryDetailOverlay';
import { BattleHistoryList } from './BattleHistoryList';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';

type RecordsSubTab = 'history' | 'ranking';

interface RecordsScreenProps {
  battleHistory: BattleHistoryEntry[];
  canRematch: boolean;
  onRequestRematch: (entry: BattleHistoryEntry) => void;
  onBack: () => void;
  onOpponentCardView?: () => void;
}

export function RecordsScreen({
  battleHistory,
  canRematch,
  onRequestRematch,
  onBack,
  onOpponentCardView,
}: RecordsScreenProps) {
  const [subTab, setSubTab] = useState<RecordsSubTab>('history');
  const [selectedEntry, setSelectedEntry] = useState<BattleHistoryEntry | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="screen screen-records">
      <header className="records-header">
        <button type="button" className="records-back-btn" onClick={onBack}>
          バトルに戻る
        </button>
        <div className="records-help-slot" aria-hidden={subTab !== 'history'}>
          {subTab === 'history' && (
            <HelpInfoButton
              className="records-help-btn"
              ariaLabel="バトル履歴のヘルプ"
              onClick={() => setHelpOpen(true)}
            />
          )}
        </div>
      </header>
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
          onClick={() => {
            setSubTab('ranking');
            setHelpOpen(false);
          }}
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
          onOpponentCardView={onOpponentCardView}
        />
      )}
      {helpOpen && (
        <HelpPanelModal
          topic={getBattleHistoryHelp()}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </section>
  );
}
