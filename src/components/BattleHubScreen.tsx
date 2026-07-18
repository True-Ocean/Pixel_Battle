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
type BattleModeIconId = 'cpu' | 'offlinePvp' | 'friend' | 'serious';

function BattleModeIcon({ mode }: { mode: BattleModeIconId }) {
  if (mode === 'cpu') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <rect x="7" y="7" width="18" height="18" rx="4" />
        <path d="M12 13h8v6h-8zM4 11h3M4 16h3M4 21h3M25 11h3M25 16h3M25 21h3M11 4v3M16 4v3M21 4v3M11 25v3M16 25v3M21 25v3" />
        <circle cx="14" cy="16" r="1" className="battle-mode-icon-fill" />
        <circle cx="19" cy="16" r="1" className="battle-mode-icon-fill" />
      </svg>
    );
  }
  if (mode === 'offlinePvp') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <rect
          x="4.5"
          y="7.5"
          width="8"
          height="17"
          rx="2"
          transform="rotate(-7 8.5 16)"
        />
        <rect
          x="19.5"
          y="7.5"
          width="8"
          height="17"
          rx="2"
          transform="rotate(7 23.5 16)"
        />
      </svg>
    );
  }
  if (mode === 'friend') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <circle cx="11" cy="11" r="4" />
        <circle cx="22" cy="12" r="3.5" />
        <path d="M4.5 25c.5-5 3-7.5 6.5-7.5s6 2.5 6.5 7.5M17 25c.3-3.8 2.2-6 5-6s4.7 2.2 5 6M14 13.5l5-1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4 25 7v7c0 6-3.5 10.5-9 14-5.5-3.5-9-8-9-14V7l9-3Z" />
      <path d="m11 15 3 3 7-7" />
    </svg>
  );
}

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
          <div
            className="battle-hub-mode-list"
            role="group"
            aria-label="バトルモード"
          >
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--cpu"
              onClick={() => setView('deckSelect')}
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="cpu" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">CPU戦</span>
                <span className="battle-hub-mode-btn-description">
                  CPUを相手に腕試し
                </span>
              </span>
              <span className="battle-hub-mode-network battle-hub-mode-network--offline">
                OFFLINE
              </span>
            </button>
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--offline-pvp"
              onClick={onOpenOfflinePvp}
              disabled={!offlinePvpUnlocked}
              aria-disabled={!offlinePvpUnlocked}
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="offlinePvp" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">対人戦</span>
                {offlinePvpUnlocked ? (
                  <span className="battle-hub-mode-btn-description">
                    公開デッキに挑戦
                  </span>
                ) : (
                  <span className="battle-hub-mode-btn-soon">
                    Lv{OFFLINE_PVP_MIN_USER_LEVEL}で解放
                  </span>
                )}
              </span>
              <span className="battle-hub-mode-network battle-hub-mode-network--offline">
                OFFLINE
              </span>
            </button>
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--friend"
              onClick={onOpenOnlinePvp}
              disabled={!onlinePvpUnlocked || !supabaseConfigured}
              aria-disabled={!onlinePvpUnlocked || !supabaseConfigured}
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="friend" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">
                  フレンド対戦
                </span>
                {!onlinePvpUnlocked ? (
                  <span className="battle-hub-mode-btn-soon">
                    Lv{ONLINE_PVP_MIN_USER_LEVEL}で解放
                  </span>
                ) : !supabaseConfigured ? (
                  <span className="battle-hub-mode-btn-soon">
                    接続設定が必要です
                  </span>
                ) : (
                  <span className="battle-hub-mode-btn-description">
                    友達とリアルタイム対戦
                  </span>
                )}
              </span>
              <span className="battle-hub-mode-network battle-hub-mode-network--online">
                ONLINE
              </span>
            </button>
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--serious"
              disabled
              aria-disabled
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="serious" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">真剣勝負！</span>
                <span className="battle-hub-mode-btn-soon">開発中</span>
              </span>
              <span className="battle-hub-mode-network battle-hub-mode-network--online">
                ONLINE
              </span>
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
