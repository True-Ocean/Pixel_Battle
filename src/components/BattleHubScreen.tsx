import { useState } from 'react';
import type { DeckLayout } from '../types';
import { getBattleHubHelp, getCpuBattleModeHelp } from '../config/helpContent';
import {
  OFFLINE_PVP_MIN_USER_LEVEL,
  isOfflinePvpUnlockedAtUserLevel,
} from '../offlinePvp';
import {
  ONLINE_PVP_MIN_USER_LEVEL,
} from '../onlinePvp';
import { BattleDeckSelectScreen } from './BattleDeckSelectScreen';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';

type BattleHubView = 'modes' | 'deckSelect';

interface BattleHubScreenProps {
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  userLevel: number;
  onStartBattle: (deckIndex: number) => void;
  onOpenOfflinePvp: () => void;
  onOpenOnlinePvp: () => void;
  onlinePvpUnlocked: boolean;
  supabaseConfigured: boolean;
  onGoToMyDeck: (deckIndex: number, cardId: string) => void;
  onReorderDeckAt: (deckIndex: number, layout: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
  onOpenRecords: () => void;
}

export function BattleHubScreen({
  decks,
  deckNames,
  unlockedDeckCount,
  lastBattleDeckIndex,
  userLevel,
  onStartBattle,
  onOpenOfflinePvp,
  onOpenOnlinePvp,
  onlinePvpUnlocked,
  supabaseConfigured,
  onGoToMyDeck,
  onReorderDeckAt,
  onMoveCardBetweenDecks,
  onOpenRecords,
}: BattleHubScreenProps) {
  const [view, setView] = useState<BattleHubView>('modes');
  const [helpOpen, setHelpOpen] = useState(false);
  const offlinePvpUnlocked = isOfflinePvpUnlockedAtUserLevel(userLevel);

  if (view === 'deckSelect') {
    return (
      <BattleDeckSelectScreen
        decks={decks}
        deckNames={deckNames}
        unlockedDeckCount={unlockedDeckCount}
        lastBattleDeckIndex={lastBattleDeckIndex}
        title="CPU戦"
        modeHelp={getCpuBattleModeHelp()}
        onStartBattle={onStartBattle}
        onBack={() => setView('modes')}
        onGoToMyDeck={onGoToMyDeck}
        onReorderDeckAt={onReorderDeckAt}
        onMoveCardBetweenDecks={onMoveCardBetweenDecks}
      />
    );
  }

  return (
    <section className="screen screen-battle-hub screen-battle-hub-modes">
      <button
        type="button"
        className="battle-hub-records-btn"
        aria-label="戦績を見る"
        onClick={onOpenRecords}
      >
        <span className="battle-hub-records-btn-icon" aria-hidden>
          📊
        </span>
      </button>
      <div className="battle-hub-center">
        <div className="battle-hub-mode-panel">
          <div className="battle-hub-mode-panel-head">
            <HelpInfoButton
              className="battle-hub-help-btn"
              ariaLabel="バトルについて"
              onClick={() => setHelpOpen(true)}
            />
          </div>
          <div className="battle-hub-mode-list" role="group" aria-label="バトルモード">
          <button
            type="button"
            className="battle-hub-mode-btn"
            onClick={() => setView('deckSelect')}
          >
            <span className="battle-hub-mode-btn-label">CPU戦</span>
          </button>
          <button
            type="button"
            className="battle-hub-mode-btn"
            onClick={onOpenOfflinePvp}
            disabled={!offlinePvpUnlocked}
            aria-disabled={!offlinePvpUnlocked}
          >
            <span className="battle-hub-mode-btn-label">対人戦（オフライン）</span>
            {!offlinePvpUnlocked && (
              <span className="battle-hub-mode-btn-soon">
                （Lv{OFFLINE_PVP_MIN_USER_LEVEL}で解放）
              </span>
            )}
          </button>
          <button
            type="button"
            className="battle-hub-mode-btn"
            onClick={onOpenOnlinePvp}
            disabled={!onlinePvpUnlocked || !supabaseConfigured}
            aria-disabled={!onlinePvpUnlocked || !supabaseConfigured}
          >
            <span className="battle-hub-mode-btn-label">フレンド対戦（オンライン）</span>
            {!onlinePvpUnlocked && (
              <span className="battle-hub-mode-btn-soon">
                （Lv{ONLINE_PVP_MIN_USER_LEVEL}で解放）
              </span>
            )}
            {onlinePvpUnlocked && !supabaseConfigured && (
              <span className="battle-hub-mode-btn-soon">（要 Supabase）</span>
            )}
          </button>
        </div>
        </div>
      </div>
      {helpOpen && (
        <HelpPanelModal
          topic={getBattleHubHelp(userLevel)}
          panelClassName="help-panel--categorized"
          onClose={() => setHelpOpen(false)}
        />
      )}
    </section>
  );
}
