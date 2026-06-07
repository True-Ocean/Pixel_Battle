import { useCallback, useState } from 'react';
import type { Card, ScreenId, UserProfile, BattleOutcome } from './types';
import { DECK_MAX } from './config/balance';
import { applyCardSurvivalRecords } from './card';
import { buildBalancedCpuDeck } from './game/cpuDeck';
import { loadSave, saveSave } from './storage';
import {
  createInitialProfile,
  isProfileComplete,
  recordUserBattleOutcome,
} from './user';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { SetupScreen } from './components/SetupScreen';
import { UserProfileBar } from './components/UserProfileBar';
import './App.css';

function initialScreen(user: UserProfile | null): ScreenId {
  return isProfileComplete(user) ? 'deck' : 'setup';
}

function App() {
  const initialSave = loadSave();
  const [screen, setScreen] = useState<ScreenId>(() =>
    initialScreen(initialSave.user),
  );
  const [user, setUser] = useState<UserProfile | null>(initialSave.user);
  const [deck, setDeck] = useState<Card[]>(() => initialSave.deck);
  const [fauxLostCardId, setFauxLostCardId] = useState<string | null>(null);

  const [cpuDeck, setCpuDeck] = useState<Card[]>(() =>
    buildBalancedCpuDeck(initialSave.deck),
  );
  const [battleSetupKey, setBattleSetupKey] = useState(0);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const persistSave = useCallback(
    (next: { user?: UserProfile | null; deck?: Card[] }) => {
      saveSave({
        user: next.user !== undefined ? next.user : user,
        deck: (next.deck ?? deck).slice(0, DECK_MAX),
      });
    },
    [deck, user],
  );

  const completeSetup = useCallback(
    (username: string) => {
      const profile = createInitialProfile(username);
      setUser(profile);
      persistSave({ user: profile });
      setScreen('deck');
    },
    [persistSave],
  );

  const goToBattleSetup = useCallback(() => {
    setCpuDeck(buildBalancedCpuDeck(deck));
    setBattleSetupKey((k) => k + 1);
    setScreen('battleSetup');
  }, [deck]);

  const addCard = useCallback(
    (card: Card) => {
      setDeck((prev) => {
        const next = [...prev, card].slice(0, DECK_MAX);
        persistSave({ deck: next });
        return next;
      });
    },
    [persistSave],
  );

  const updateCard = useCallback(
    (updated: Card) => {
      setDeck((prev) => {
        const next = prev.map((c) => (c.id === updated.id ? updated : c));
        persistSave({ deck: next });
        return next;
      });
    },
    [persistSave],
  );

  const deleteCard = useCallback(
    (id: string) => {
      setDeck((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persistSave({ deck: next });
        return next;
      });
      setFauxLostCardId((prev) => (prev === id ? null : prev));
    },
    [persistSave],
  );

  const reorderDeck = useCallback(
    (ordered: Card[]) => {
      setDeck(ordered);
      persistSave({ deck: ordered });
    },
    [persistSave],
  );

  const applyBattleOutcome = useCallback((outcome: BattleOutcome) => {
    setFauxLostCardId(outcome.fauxLostCardId);
    setUser((prevUser) => {
      const nextUser = isProfileComplete(prevUser)
        ? recordUserBattleOutcome(prevUser, {
            cpuDefeatedCount: outcome.cpuDefeatedCount,
            winner: outcome.winner,
            playerDeckPower: outcome.playerDeckPower,
            opponentDeckPower: outcome.opponentDeckPower,
          })
        : prevUser;
      setDeck((prevDeck) => {
        const nextDeck = applyCardSurvivalRecords(
          prevDeck,
          outcome.playerCardIds,
          outcome.defeatedPlayerCardIds,
        );
        saveSave({ user: nextUser, deck: nextDeck });
        return nextDeck;
      });
      return nextUser;
    });
  }, []);

  const goToDeck = useCallback(() => setScreen('deck'), []);

  const showAppHeader =
    screen !== 'editor' && screen !== 'battleSetup' && screen !== 'setup';
  const showProfileBar = showAppHeader && isProfileComplete(user);

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
      {screen === 'setup' && (
        <header className="app-header app-header-setup">
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
        </header>
      )}

      {showAppHeader && (
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
            {showProfileBar && user && <UserProfileBar user={user} />}
          </div>
          {nav}
        </header>
      )}

      <main>
        {screen === 'setup' && <SetupScreen onComplete={completeSetup} />}
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
            userLevel={user?.level ?? 1}
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
            playerIdentity={
              isProfileComplete(user)
                ? { name: user.username, level: user.level }
                : undefined
            }
            onFinish={applyBattleOutcome}
            onGoToDeck={goToDeck}
            onNewBattle={goToBattleSetup}
          />
        )}
      </main>

      {screen !== 'setup' && (
        <footer className="app-footer">
          <span>
            仕様:{' '}
            <code>docs/PROTOTYPE_DEVELOPMENT_SPEC.md</code>
          </span>
        </footer>
      )}
    </div>
  );
}

export default App;
