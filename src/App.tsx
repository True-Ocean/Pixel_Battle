import { useCallback, useMemo, useRef, useState } from 'react';
import type { Card, ScreenId, UserProfile, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry } from './battleHistory';
import { DECK_MAX, MAX_USER_LEVEL } from './config/balance';
import { updateDeckAtIndex, clampUnlockedDeckCount } from './deckSlots';
import { applyCardSurvivalRecords, recordCardRevive, rescaleDeckBp } from './card';
import { buildBalancedCpuDeck, randomCpuName } from './game/cpuDeck';
import { loadSave, resetBattleRecords, saveSave } from './storage';
import {
  applyDevUserProfile,
  createInitialProfile,
  isProfileComplete,
  recordUserBattleOutcome,
  totalExpForLevel,
} from './user';
import { AppTitle } from './components/AppTitle';
import { AppDock } from './components/AppDock';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleHubScreen } from './components/BattleHubScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { RecordsScreen } from './components/RecordsScreen';
import { SettingsScreen } from './components/SettingsScreen';
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
  const [decks, setDecks] = useState<Card[][]>(() => initialSave.decks);
  const [activeDeckIndex, setActiveDeckIndex] = useState(
    () => initialSave.activeDeckIndex,
  );
  const [unlockedDeckCount, setUnlockedDeckCount] = useState(
    () => initialSave.unlockedDeckCount,
  );
  const [fauxLostCardId, setFauxLostCardId] = useState<string | null>(null);

  const activeDeck = useMemo(
    () => decks[activeDeckIndex] ?? [],
    [activeDeckIndex, decks],
  );

  const [cpuDeck, setCpuDeck] = useState<Card[]>(() =>
    buildBalancedCpuDeck(
      initialSave.decks[initialSave.activeDeckIndex] ?? [],
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
  const [editorReturnToDetail, setEditorReturnToDetail] = useState(false);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  const userRef = useRef(user);
  const decksRef = useRef(decks);
  const activeDeckIndexRef = useRef(activeDeckIndex);
  const unlockedDeckCountRef = useRef(unlockedDeckCount);
  const battleHistoryRef = useRef(battleHistory);
  const isPracticeRematchRef = useRef(false);
  const practiceRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
  userRef.current = user;
  decksRef.current = decks;
  activeDeckIndexRef.current = activeDeckIndex;
  unlockedDeckCountRef.current = unlockedDeckCount;
  battleHistoryRef.current = battleHistory;

  const persistSave = useCallback(
    (next: {
      user?: UserProfile | null;
      decks?: Card[][];
      activeDeckIndex?: number;
      unlockedDeckCount?: number;
      battleHistory?: BattleHistoryEntry[];
    }) => {
      saveSave({
        user: next.user !== undefined ? next.user : user,
        decks: next.decks ?? decks,
        activeDeckIndex: next.activeDeckIndex ?? activeDeckIndex,
        unlockedDeckCount: next.unlockedDeckCount ?? unlockedDeckCount,
        battleHistory: next.battleHistory ?? battleHistoryRef.current,
      });
    },
    [activeDeckIndex, decks, unlockedDeckCount, user],
  );

  const updateActiveDeck = useCallback(
    (updater: (prev: Card[]) => Card[]) => {
      setDecks((prevDecks) => {
        const index = activeDeckIndexRef.current;
        const nextDecks = updateDeckAtIndex(
          prevDecks,
          index,
          updater(prevDecks[index] ?? []),
        );
        persistSave({ decks: nextDecks });
        return nextDecks;
      });
    },
    [persistSave],
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
    const currentDeck = decksRef.current[activeDeckIndexRef.current] ?? [];
    setCpuDeck(buildBalancedCpuDeck(currentDeck, Math.random, level));
    setCpuOpponent({ name: randomCpuName(), level });
    setBattleSetupKey((k) => k + 1);
    setBattleEndDock(false);
    setScreen('battleSetup');
  }, [clearPracticeRematch, user?.level]);

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
      updateActiveDeck((prev) => [...prev, card].slice(0, DECK_MAX));
    },
    [updateActiveDeck],
  );

  const updateCard = useCallback(
    (updated: Card) => {
      updateActiveDeck((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
    },
    [updateActiveDeck],
  );

  const deleteCard = useCallback(
    (id: string) => {
      updateActiveDeck((prev) => prev.filter((c) => c.id !== id));
      setFauxLostCardId((prev) => (prev === id ? null : prev));
    },
    [updateActiveDeck],
  );

  const reorderDeck = useCallback(
    (ordered: Card[]) => {
      setDecks((prevDecks) => {
        const nextDecks = updateDeckAtIndex(
          prevDecks,
          activeDeckIndexRef.current,
          ordered,
        );
        persistSave({ decks: nextDecks });
        return nextDecks;
      });
    },
    [persistSave],
  );

  const handleSelectDeckIndex = useCallback(
    (index: number) => {
      setActiveDeckIndex(index);
      setDetailCardId(null);
      persistSave({ activeDeckIndex: index });
    },
    [persistSave],
  );

  const applyBattleOutcome = useCallback((outcome: BattleOutcome) => {
    if (isPracticeRematchRef.current) {
      return;
    }
    setFauxLostCardId(outcome.fauxLostCardId);
    const prevUser = userRef.current;
    const prevDecks = decksRef.current;
    const deckIndex = activeDeckIndexRef.current;
    const prevActiveDeck = prevDecks[deckIndex] ?? [];
    const nextUser = isProfileComplete(prevUser)
      ? recordUserBattleOutcome(prevUser, {
          cpuDefeatedCount: outcome.cpuDefeatedCount,
          winner: outcome.winner,
          playerDeckPower: outcome.playerDeckPower,
          opponentDeckPower: outcome.opponentDeckPower,
        })
      : prevUser;
    const nextActiveDeck = applyCardSurvivalRecords(
      prevActiveDeck,
      outcome.playerCardIds,
      outcome.defeatedPlayerCardIds,
    );
    const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextActiveDeck);
    const nextHistory = appendBattleHistory(
      battleHistoryRef.current,
      createBattleHistoryEntry(outcome),
    );
    saveSave({
      user: nextUser,
      decks: nextDecks,
      activeDeckIndex: deckIndex,
      unlockedDeckCount: unlockedDeckCountRef.current,
      battleHistory: nextHistory,
    });
    setUser(nextUser);
    setDecks(nextDecks);
    setBattleHistory(nextHistory);
  }, []);

  const handleBattleEndedChange = useCallback((ended: boolean) => {
    setBattleEndDock(ended);
  }, []);

  const handleResetBattleRecords = useCallback(() => {
    const next = resetBattleRecords({
      user,
      decks,
      activeDeckIndex,
      unlockedDeckCount,
      battleHistory,
    });
    persistSave(next);
    setUser(next.user);
    setDecks(next.decks);
    setActiveDeckIndex(next.activeDeckIndex);
    setUnlockedDeckCount(next.unlockedDeckCount);
    setBattleHistory(next.battleHistory ?? []);
    setFauxLostCardId(null);
  }, [activeDeckIndex, battleHistory, decks, persistSave, unlockedDeckCount, user]);

  const handleDevSetLevel = useCallback(
    (level: number) => {
      if (!import.meta.env.DEV || !isProfileComplete(user)) return;
      const clamped = Math.max(1, Math.min(MAX_USER_LEVEL, Math.floor(level)));
      const nextUser = {
        ...user,
        level: clamped,
        exp: totalExpForLevel(clamped),
      };
      const nextDecks = decks.map((deck) => rescaleDeckBp(deck, clamped));
      persistSave({ user: nextUser, decks: nextDecks });
      setUser(nextUser);
      setDecks(nextDecks);
    },
    [decks, persistSave, user],
  );

  const handleDevSetUnlockedDeckCount = useCallback(
    (count: number) => {
      if (!import.meta.env.DEV) return;
      const clamped = clampUnlockedDeckCount(count);
      const nextActiveIndex =
        activeDeckIndex >= clamped ? 0 : activeDeckIndex;
      setUnlockedDeckCount(clamped);
      if (nextActiveIndex !== activeDeckIndex) {
        setActiveDeckIndex(nextActiveIndex);
        setDetailCardId(null);
      }
      persistSave({
        unlockedDeckCount: clamped,
        activeDeckIndex: nextActiveIndex,
      });
    },
    [activeDeckIndex, persistSave],
  );

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
            deck={activeDeck}
            decks={decks}
            activeDeckIndex={activeDeckIndex}
            unlockedDeckCount={unlockedDeckCount}
            fauxLostCardId={fauxLostCardId}
            detailCardId={detailCardId}
            onDetailCardIdChange={setDetailCardId}
            onSelectDeckIndex={handleSelectDeckIndex}
            onCreateCard={() => {
              setEditingCard(null);
              setEditorReturnToDetail(false);
              setDetailCardId(null);
              setScreen('editor');
            }}
            onEditCard={(card, options) => {
              setEditingCard(card);
              setEditorReturnToDetail(options?.returnToDetail ?? false);
              if (!options?.returnToDetail) {
                setDetailCardId(null);
              }
              setScreen('editor');
            }}
            onDeleteCard={deleteCard}
            onReviveFauxLost={(id) => {
              updateActiveDeck((prev) => recordCardRevive(prev, id));
              setFauxLostCardId((prev) => (prev === id ? null : prev));
            }}
            onReorderDeck={reorderDeck}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen deckCount={activeDeck.length} onStartBattle={goToBattleSetup} />
        )}
        {screen === 'records' && (
          <RecordsScreen
            battleHistory={battleHistory}
            deckCount={activeDeck.length}
            onPracticeRematch={goToPracticeRematch}
          />
        )}
        {screen === 'shop' && (
          <PlaceholderScreen title="ショップ" />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            user={user}
            unlockedDeckCount={unlockedDeckCount}
            onResetBattleRecords={handleResetBattleRecords}
            onDevSetLevel={handleDevSetLevel}
            onDevSetUnlockedDeckCount={handleDevSetUnlockedDeckCount}
          />
        )}
        {screen === 'editor' && (
          <EditorScreen
            key={editingCard?.id ?? 'new'}
            deckCount={activeDeck.length}
            userLevel={user?.level ?? 1}
            editTarget={editingCard}
            backLabel={editorReturnToDetail ? '戻る' : 'マイデッキに戻る'}
            onBack={() => {
              const returnToDetail = editorReturnToDetail;
              setEditingCard(null);
              setEditorReturnToDetail(false);
              if (!returnToDetail) {
                setDetailCardId(null);
              }
              setScreen('deck');
            }}
            onCreated={addCard}
            onUpdated={updateCard}
          />
        )}
        {screen === 'battleSetup' && (
          <BattleSetupScreen
            key={battleSetupKey}
            playerDeck={activeDeck}
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
