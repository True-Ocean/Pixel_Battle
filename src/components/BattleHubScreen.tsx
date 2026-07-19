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
import {
  BattleModeIcon,
  OnlineNetworkIcon,
} from './BattleModeHeader';

import { BattleDeckSelectScreen } from './BattleDeckSelectScreen';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';
import { SeriousBattleComingSoonScreen } from './SeriousBattleComingSoonScreen';

type BattleHubView = 'modes' | 'deckSelect' | 'seriousComingSoon';

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
  onModeScreenChange: (open: boolean) => void;
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
  onModeScreenChange,
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
        battleMode="cpu"
        backLabel="バトルモード選択に戻る"
        startButtonLabel="マッチング開始"
        showDeckSelectSubheader
        startButtonInBottomNav
        modeHelp={getCpuBattleModeHelp()}
        onStartBattle={onStartBattle}
        onBack={() => {
          setView('modes');
          onModeScreenChange(false);
        }}
        onGoToMyDeck={onGoToMyDeck}
        onReorderDeckAt={onReorderDeckAt}
        onMoveCardBetweenDecks={onMoveCardBetweenDecks}
      />
    );
  }

  if (view === 'seriousComingSoon') {
    return (
      <SeriousBattleComingSoonScreen
        onBack={() => {
          setView('modes');
          onModeScreenChange(false);
        }}
      />
    );
  }

  return (
    <section className="screen screen-battle-hub screen-battle-hub-modes">
      <div className="battle-mode-screen-toolbar battle-hub-mode-toolbar">
        <HelpInfoButton
          className="battle-hub-help-btn"
          ariaLabel="バトルについて"
          onClick={() => setHelpOpen(true)}
        />
      </div>
      <div className="battle-hub-center">
        <div className="battle-hub-mode-panel">
          <div
            className="battle-hub-mode-list"
            role="group"
            aria-label="バトルメニュー"
          >
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--cpu"
              onClick={() => {
                setView('deckSelect');
                onModeScreenChange(true);
              }}
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
                <span className="battle-hub-mode-btn-label">公開デッキ戦</span>
                {offlinePvpUnlocked ? (
                  <span className="battle-hub-mode-btn-description">
                    他ユーザーのデッキで腕試し
                  </span>
                ) : (
                  <span className="battle-hub-mode-btn-soon">
                    Lv{OFFLINE_PVP_MIN_USER_LEVEL}で解放
                  </span>
                )}
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
                    友達とリアルタイムバトル
                  </span>
                )}
              </span>
              <span
                className="battle-hub-mode-online-icon"
                role="img"
                aria-label="オンライン通信"
              >
                <OnlineNetworkIcon />
              </span>
            </button>
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--serious"
              onClick={() => {
                setView('seriousComingSoon');
                onModeScreenChange(true);
              }}
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="serious" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">真剣勝負！</span>
                <span className="battle-hub-mode-btn-soon">
                  <span className="battle-hub-mode-btn-serious-description">
                    他ユーザーとリアルタイムバトル
                  </span>
                  <span className="battle-hub-mode-btn-serious-status">
                    （開発中）
                  </span>
                </span>
              </span>
              <span
                className="battle-hub-mode-online-icon"
                role="img"
                aria-label="オンライン通信"
              >
                <OnlineNetworkIcon />
              </span>
            </button>
            <button
              type="button"
              className="battle-hub-mode-btn battle-hub-mode-btn--records"
              onClick={onOpenRecords}
            >
              <span className="battle-hub-mode-btn-icon">
                <BattleModeIcon mode="records" />
              </span>
              <span className="battle-hub-mode-btn-copy">
                <span className="battle-hub-mode-btn-label">
                  バトル履歴とランキング
                </span>
                <span className="battle-hub-mode-btn-description">
                  戦績やランキングを確認
                </span>
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
