import { useState } from 'react';
import type { DeckLayout } from '../types';
import { BattleDeckSelectScreen } from './BattleDeckSelectScreen';

type BattleHubView = 'modes' | 'deckSelect';

interface BattleHubScreenProps {
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  onStartBattle: (deckIndex: number) => void;
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
  onStartBattle,
  onGoToMyDeck,
  onReorderDeckAt,
  onMoveCardBetweenDecks,
  onOpenRecords,
}: BattleHubScreenProps) {
  const [view, setView] = useState<BattleHubView>('modes');

  if (view === 'deckSelect') {
    return (
      <BattleDeckSelectScreen
        decks={decks}
        deckNames={deckNames}
        unlockedDeckCount={unlockedDeckCount}
        lastBattleDeckIndex={lastBattleDeckIndex}
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
            disabled
            aria-disabled="true"
          >
            <span className="battle-hub-mode-btn-label">対人戦（オフライン）</span>
            <span className="battle-hub-mode-btn-soon">（準備中）</span>
          </button>
          <button
            type="button"
            className="battle-hub-mode-btn"
            disabled
            aria-disabled="true"
          >
            <span className="battle-hub-mode-btn-label">フレンド対戦</span>
            <span className="battle-hub-mode-btn-soon">（準備中）</span>
          </button>
        </div>
      </div>
    </section>
  );
}
