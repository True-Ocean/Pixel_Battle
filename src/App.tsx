import { useCallback, useState } from 'react';
import type { Card, ScreenId } from './types';
import { DECK_MAX } from './config/balance';
import { buildBalancedCpuDeck } from './game/cpuDeck';
import { loadSave, saveDeck } from './storage';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import './App.css';

function App() {
  const [screen, setScreen] = useState<ScreenId>('deck');
  const [deck, setDeck] = useState<Card[]>(() => loadSave().deck);
  const [fauxLostCardId, setFauxLostCardId] = useState<string | null>(null);

  const [cpuDeck, setCpuDeck] = useState<Card[]>(() =>
    buildBalancedCpuDeck(deck),
  );
  const [battleSetupKey, setBattleSetupKey] = useState(0);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const goToBattleSetup = useCallback(() => {
    setCpuDeck(buildBalancedCpuDeck(deck));
    setBattleSetupKey((k) => k + 1);
    setScreen('battleSetup');
  }, [deck]);

  const addCard = useCallback((card: Card) => {
    setDeck((prev) => {
      const next = [...prev, card].slice(0, DECK_MAX);
      saveDeck(next);
      return next;
    });
  }, []);

  const updateCard = useCallback((updated: Card) => {
    setDeck((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      saveDeck(next);
      return next;
    });
  }, []);

  const deleteCard = useCallback((id: string) => {
    setDeck((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveDeck(next);
      return next;
    });
    setFauxLostCardId((prev) => (prev === id ? null : prev));
  }, []);

  const reorderDeck = useCallback((ordered: Card[]) => {
    setDeck(ordered);
    saveDeck(ordered);
  }, []);

  const applyBattleOutcome = useCallback(
    (outcome: {
      winner: 'player' | 'cpu';
      playerCardIds: string[];
      fauxLostCardId: string | null;
    }) => {
      setDeck((prev) => {
        const next = prev.map((c) => {
          if (!outcome.playerCardIds.includes(c.id)) return c;
          return {
            ...c,
            wins: outcome.winner === 'player' ? c.wins + 1 : c.wins,
            losses: outcome.winner === 'cpu' ? c.losses + 1 : c.losses,
          };
        });
        saveDeck(next);
        return next;
      });
      setFauxLostCardId(outcome.fauxLostCardId);
    },
    [],
  );

  const goToDeck = useCallback(() => setScreen('deck'), []);

  const navItems = (
    [
      ['deck', 'デッキ'],
      ['battleSetup', 'バトル'],
    ] as const
  ).filter(
    ([id]) =>
      !(screen === 'deck' && (id === 'deck' || id === 'battleSetup')),
  );

  const nav = navItems.length > 0 && (
    <nav
      className={`app-nav${navItems.length === 1 ? ' is-single' : ''}`}
      aria-label="画面"
    >
      {navItems.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={
            screen === id || (id === 'battleSetup' && screen === 'battle')
              ? 'active'
              : ''
          }
          onClick={() =>
            id === 'battleSetup' ? goToBattleSetup() : setScreen(id)
          }
        >
          {label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`app app-screen-${screen}`}>
      {screen !== 'editor' && screen !== 'battleSetup' && (
        <header className="app-header">
          <div className="app-brand">
            <h1 className="app-title" aria-label="簡単！真剣！お絵描きピクセルバトル！">
              <span className="app-title-hooks">
                <span className="app-title-easy">簡単！</span>
                <span className="app-title-serious">真剣！</span>
              </span>
              <span className="app-title-main">
                <span className="app-title-oekaki">お絵描き</span>
                <span className="app-title-pixel">ピクセル</span>
                <span className="app-title-battle">バトル！</span>
              </span>
            </h1>
          </div>
          {nav}
        </header>
      )}

      <main>
        {screen === 'deck' && (
          <DeckScreen
            deck={deck}
            fauxLostCardId={fauxLostCardId}
            onCreateCard={() => {
              setEditingCard(null);
              setScreen('editor');
            }}
            onStartBattle={goToBattleSetup}
            onEditCard={(card) => {
              setEditingCard(card);
              setScreen('editor');
            }}
            onDeleteCard={deleteCard}
            onReorderDeck={reorderDeck}
          />
        )}
        {screen === 'editor' && (
          <EditorScreen
            key={editingCard?.id ?? 'new'}
            deckCount={deck.length}
            editTarget={editingCard}
            onBack={() => {
              setEditingCard(null);
              setScreen('deck');
            }}
            onCreated={addCard}
            onUpdated={updateCard}
          />
        )}
        {screen === 'battleSetup' && (
          <BattleSetupScreen
            key={battleSetupKey}
            playerDeck={deck}
            cpuDeck={cpuDeck}
            onFinish={applyBattleOutcome}
            onGoToDeck={goToDeck}
            onNewBattle={goToBattleSetup}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>
          仕様:{' '}
          <code>docs/PROTOTYPE_DEVELOPMENT_SPEC.md</code>
        </span>
      </footer>
    </div>
  );
}

export default App;
