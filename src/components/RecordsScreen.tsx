import { useState } from 'react';
import { getBattleHistoryHelp } from '../config/helpContent';
import type { BattleHistoryEntry } from '../types';
import { BattleHistoryDetailOverlay } from './BattleHistoryDetailOverlay';
import { BattleHistoryList } from './BattleHistoryList';
import { BattleModeHeader } from './BattleModeHeader';
import { HelpPanelModal } from './HelpPanelModal';

type RecordsSubTab = 'history' | 'ranking';

interface RecordsScreenProps {
  battleHistory: BattleHistoryEntry[];
  canRematch: boolean;
  onRequestRematch: (entry: BattleHistoryEntry) => void;
  onOpenOpponentProfile: (entry: BattleHistoryEntry) => void;
  onBack: () => void;
  onOpponentCardView?: () => void;
}

export function RecordsScreen({
  battleHistory,
  canRematch,
  onRequestRematch,
  onOpenOpponentProfile,
  onBack,
  onOpponentCardView,
}: RecordsScreenProps) {
  const [subTab, setSubTab] = useState<RecordsSubTab>('history');
  const [selectedEntry, setSelectedEntry] = useState<BattleHistoryEntry | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const historyHelp = getBattleHistoryHelp();

  return (
    <section className="screen screen-records">
      <header className="records-header">
        <BattleModeHeader
          mode="records"
          onHelp={
            subTab === 'history' ? () => setHelpOpen(true) : undefined
          }
          helpAriaLabel={`${historyHelp.title}のヘルプ`}
        />
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

      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          バトルモード選択画面に戻る
        </button>
      </div>

      {selectedEntry && (
        <BattleHistoryDetailOverlay
          entry={selectedEntry}
          canRematch={canRematch}
          onClose={() => setSelectedEntry(null)}
          onOpenOpponentProfile={(entry) => {
            setSelectedEntry(null);
            onOpenOpponentProfile(entry);
          }}
          onRematch={(entry) => {
            setSelectedEntry(null);
            onRequestRematch(entry);
          }}
          onOpponentCardView={onOpponentCardView}
        />
      )}
      {helpOpen && (
        <HelpPanelModal
          topic={historyHelp}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </section>
  );
}
