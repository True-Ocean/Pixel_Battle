import { useCallback, useRef, useState } from 'react';
import type { Card, ScreenId, UserProfile, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry } from './battleHistory';
import { DECK_MAX } from './config/balance';
import { applyCardSurvivalRecords, recordCardRevive } from './card';
import { buildBalancedCpuDeck, randomCpuName } from './game/cpuDeck';
import { loadSave, saveSave } from './storage';
import {
  applyDevUserProfile,
  createInitialProfile,
  isProfileComplete,
  recordUserBattleOutcome,
} from './user';
import { AppTitle } from './components/AppTitle';
import { AppDock } from './components/AppDock';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleHubScreen } from './components/BattleHubScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { RecordsScreen } from './components/RecordsScreen';
import { PlaceholderScreen } from './components/PlaceholderScreen';
import { SetupScreen } from './components/SetupScreen';
import { TitleScreen } from './components/TitleScreen';
import { UserProfileBar } from './components/UserProfileBar';
import { isDockVisible, isTabId, type TabId } from './navigation/screenIds';
import './App.css';

function initialScreen(user: UserProfile | null): ScreenId {
  return isProfileComplete(user) ? 'deck' : 'setup';
}

function App() {
  const initialSave = loadSave();
  const [screen, setScreen] = useState<ScreenId>('title');
  const [enterFromTitle, setEnterFromTitle] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(initialSave.user);
  const [deck, setDeck] = useState<Card[]>(() => initialSave.deck);
  const [fauxLostCardId, setFauxLostCardId] = useState<string | null>(null);

  const [cpuDeck, setCpuDeck] = useState<Card[]>(() =>
    buildBalancedCpuDeck(
      initialSave.deck,
      Math.random,
      initialSave.user?.level ?? 1,
    ),
  );
  const [cpuOpponent, setCpuOpponent] = useState(() => ({
    name: randomCpuName(),
    level: initialSave.user?.level ?? 1,
  }));
  const [battleSetupKey, setBattleSetupKey] = useState(0);
  const [battleEndDock, setBattleEndDock] = useState(false);
  const [isPracticeRematch, setIsPracticeRematch] = useState(false);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>(
    () => initialSave.battleHistory ?? [],
  );
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const userRef = useRef(user);
  const deckRef = useRef(deck);
  const battleHistoryRef = useRef(battleHistory);
  const isPracticeRematchRef = useRef(false);
  const practiceRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
  userRef.current = user;
  deckRef.current = deck;
  battleHistoryRef.current = battleHistory;

  const persistSave = useCallback(
    (next: {
      user?: UserProfile | null;
      deck?: Card[];
      battleHistory?: BattleHistoryEntry[];
    }) => {
      saveSave({
        user: next.user !== undefined ? next.user : user,
        deck: (next.deck ?? deck).slice(0, DECK_MAX),
        battleHistory: next.battleHistory ?? battleHistoryRef.current,
      });
    },
    [deck, user],
  );

  const completeSetup = useCallback(
    (username: string) => {
      const profile = applyDevUserProfile(createInitialProfile(username));
      setUser(profile);
      persistSave({ user: profile });
      setScreen('deck');
    },
    [persistSave],
  );

  const clearPracticeRematch = useCallback(() => {
    setIsPracticeRematch(false);
    isPracticeRematchRef.current = false;
    practiceRematchEntryRef.current = null;
  }, []);

  const goToBattleSetup = useCallback(() => {
    clearPracticeRematch();
    const level = user?.level ?? 1;
    setCpuDeck(buildBalancedCpuDeck(deck, Math.random, level));
    setCpuOpponent({ name: randomCpuName(), level });
    setBattleSetupKey((k) => k + 1);
    setBattleEndDock(false);
    setScreen('battleSetup');
  }, [clearPracticeRematch, deck, user?.level]);

  const goToPracticeRematch = useCallback((entry: BattleHistoryEntry) => {
    setIsPracticeRematch(true);
    isPracticeRematchRef.current = true;
    practiceRematchEntryRef.current = entry;
    setCpuDeck(structuredClone(entry.opponentDeck));
    setCpuOpponent({ name: entry.opponentName, level: entry.opponentLevel });
    setBattleSetupKey((k) => k + 1);
    setBattleEndDock(false);
    setScreen('battleSetup');
  }, []);

  const rematchSameOpponent = useCallback(() => {
    const entry = practiceRematchEntryRef.current;
    if (entry) {
      goToPracticeRematch(entry);
      return;
    }
    goToBattleSetup();
  }, [goToBattleSetup, goToPracticeRematch]);

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
    if (isPracticeRematchRef.current) {
      return;
    }
    setFauxLostCardId(outcome.fauxLostCardId);
    const prevUser = userRef.current;
    const prevDeck = deckRef.current;
    const nextUser = isProfileComplete(prevUser)
      ? recordUserBattleOutcome(prevUser, {
          cpuDefeatedCount: outcome.cpuDefeatedCount,
          winner: outcome.winner,
          playerDeckPower: outcome.playerDeckPower,
          opponentDeckPower: outcome.opponentDeckPower,
        })
      : prevUser;
    const nextDeck = applyCardSurvivalRecords(
      prevDeck,
      outcome.playerCardIds,
      outcome.defeatedPlayerCardIds,
    );
    const nextHistory = appendBattleHistory(
      battleHistoryRef.current,
      createBattleHistoryEntry(outcome),
    );
    saveSave({ user: nextUser, deck: nextDeck, battleHistory: nextHistory });
    setUser(nextUser);
    setDeck(nextDeck);
    setBattleHistory(nextHistory);
  }, []);

  const handleBattleEndedChange = useCallback((ended: boolean) => {
    setBattleEndDock(ended);
  }, []);

  const completeTitle = useCallback(() => {
    setScreen(initialScreen(user));
    setEnterFromTitle(true);
  }, [user]);

  const showAppHeader = screen === 'deck';
  const showProfileBar = showAppHeader && isProfileComplete(user);
  const showDock = isDockVisible(screen) || (screen === 'battleSetup' && battleEndDock);
  const activeTab: TabId =
    screen === 'battleSetup' && battleEndDock
      ? isPracticeRematch
        ? 'records'
        : 'battleHub'
      : isTabId(screen)
        ? screen
        : 'deck';

  const selectTab = useCallback(
    (tab: TabId) => {
      setBattleEndDock(false);
      clearPracticeRematch();
      setScreen(tab);
    },
    [clearPracticeRematch],
  );

  return (
    <div className={`app app-screen-${screen}${showDock ? ' has-dock' : ''}`}>
      {screen === 'setup' && (
        <header className="app-header app-header-setup">
          <div className="app-brand">
            <AppTitle />
          </div>
        </header>
      )}

      {showAppHeader && (
        <header className="app-header app-header--deck">
          <div className="app-brand">
            {showProfileBar && user && <UserProfileBar user={user} />}
          </div>
        </header>
      )}

      <main className={enterFromTitle ? 'is-entering-from-title' : undefined}>
        {screen === 'title' && <TitleScreen onComplete={completeTitle} />}
        {screen === 'setup' && <SetupScreen onComplete={completeSetup} />}
        {screen === 'deck' && (
          <DeckScreen
            deck={deck}
            fauxLostCardId={fauxLostCardId}
            onCreateCard={() => {
              setEditingCard(null);
              setScreen('editor');
            }}
            onEditCard={(card) => {
              setEditingCard(card);
              setScreen('editor');
            }}
            onDeleteCard={deleteCard}
            onReviveFauxLost={(id) => {
              setDeck((prev) => {
                const next = recordCardRevive(prev, id);
                persistSave({ deck: next });
                return next;
              });
              setFauxLostCardId((prev) => (prev === id ? null : prev));
            }}
            onReorderDeck={reorderDeck}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen deckCount={deck.length} onStartBattle={goToBattleSetup} />
        )}
        {screen === 'records' && (
          <RecordsScreen
            battleHistory={battleHistory}
            deckCount={deck.length}
            onPracticeRematch={goToPracticeRematch}
          />
        )}
        {screen === 'shop' && (
          <PlaceholderScreen title="ショップ" />
        )}
        {screen === 'settings' && (
          <PlaceholderScreen title="設定" />
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
            opponentIdentity={cpuOpponent}
            isPracticeRematch={isPracticeRematch}
            onFinish={applyBattleOutcome}
            onNewBattle={isPracticeRematch ? rematchSameOpponent : goToBattleSetup}
            onBattleEndedChange={handleBattleEndedChange}
          />
        )}
      </main>

      {showDock && <AppDock activeTab={activeTab} onSelect={selectTab} />}

      {screen !== 'setup' && screen !== 'title' && !showDock && (
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
