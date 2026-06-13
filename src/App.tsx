import { useCallback, useMemo, useRef, useState } from 'react';
import type { Card, ScreenId, UserProfile, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry } from './battleHistory';
import { MAX_USER_LEVEL, DECK_MAX } from './config/balance';
import { updateDeckAtIndex, clampUnlockedDeckCount, moveCardBetweenDeckSlots, countDeckCards, getDeckCards, normalizeDeckLayout, isDeckBattleReady } from './deckSlots';
import type { DeckLayout } from './types';
import { applyCardSurvivalRecords, recordCardRevive, rescaleDeckBp } from './card';
import { buildBalancedCpuDeck } from './game/cpuDeck';
import { CPU_OPPONENT_LABEL } from './battleHistory';
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
  const [decks, setDecks] = useState<DeckLayout[]>(() => initialSave.decks);
  const [activeDeckIndex, setActiveDeckIndex] = useState(
    () => initialSave.activeDeckIndex,
  );
  const [lastBattleDeckIndex, setLastBattleDeckIndex] = useState(
    () => initialSave.lastBattleDeckIndex,
  );
  const [unlockedDeckCount, setUnlockedDeckCount] = useState(
    () => initialSave.unlockedDeckCount,
  );
  const [fauxLostCardId, setFauxLostCardId] = useState<string | null>(null);

  const activeDeck = useMemo(
    () => normalizeDeckLayout(decks[activeDeckIndex] ?? []),
    [activeDeckIndex, decks],
  );

  const activeDeckCardCount = useMemo(
    () => countDeckCards(activeDeck),
    [activeDeck],
  );

  const [cpuDeck, setCpuDeck] = useState<Card[]>(() =>
    buildBalancedCpuDeck(
      getDeckCards(initialSave.decks[initialSave.activeDeckIndex] ?? []),
      Math.random,
      initialSave.user?.level ?? 1,
    ),
  );
  const [cpuOpponent, setCpuOpponent] = useState(() => ({
    name: CPU_OPPONENT_LABEL,
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
  const [deckReorderMode, setDeckReorderMode] = useState(false);
  const [battlePlayerDeck, setBattlePlayerDeck] = useState<Card[]>([]);

  const userRef = useRef(user);
  const decksRef = useRef(decks);
  const activeDeckIndexRef = useRef(activeDeckIndex);
  const lastBattleDeckIndexRef = useRef(lastBattleDeckIndex);
  const unlockedDeckCountRef = useRef(unlockedDeckCount);
  const battleHistoryRef = useRef(battleHistory);
  const isPracticeRematchRef = useRef(false);
  const practiceRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
  const battleStartSnapshotRef = useRef<{
    deckIndex: number;
    playerDeck: Card[];
    playerLevel: number;
  } | null>(null);
  userRef.current = user;
  decksRef.current = decks;
  activeDeckIndexRef.current = activeDeckIndex;
  lastBattleDeckIndexRef.current = lastBattleDeckIndex;
  unlockedDeckCountRef.current = unlockedDeckCount;
  battleHistoryRef.current = battleHistory;

  const persistSave = useCallback(
    (next: {
      user?: UserProfile | null;
      decks?: Card[][];
      activeDeckIndex?: number;
      lastBattleDeckIndex?: number;
      unlockedDeckCount?: number;
      battleHistory?: BattleHistoryEntry[];
    }) => {
      saveSave({
        user: next.user !== undefined ? next.user : user,
        decks: next.decks ?? decks,
        activeDeckIndex: next.activeDeckIndex ?? activeDeckIndex,
        lastBattleDeckIndex: next.lastBattleDeckIndex ?? lastBattleDeckIndex,
        unlockedDeckCount: next.unlockedDeckCount ?? unlockedDeckCount,
        battleHistory: next.battleHistory ?? battleHistoryRef.current,
      });
    },
    [activeDeckIndex, decks, lastBattleDeckIndex, unlockedDeckCount, user],
  );

  const updateActiveDeck = useCallback(
    (updater: (prev: DeckLayout) => DeckLayout) => {
      setDecks((prevDecks) => {
        const index = activeDeckIndexRef.current;
        const nextDecks = updateDeckAtIndex(
          prevDecks,
          index,
          updater(normalizeDeckLayout(prevDecks[index] ?? [])),
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

  const goToBattleSetup = useCallback(
    (deckIndex?: number) => {
      clearPracticeRematch();
      const level = user?.level ?? 1;
      const resolvedIndex =
        deckIndex ??
        (isDeckBattleReady(normalizeDeckLayout(decksRef.current[activeDeckIndexRef.current] ?? []))
          ? activeDeckIndexRef.current
          : lastBattleDeckIndexRef.current);
      const layout = normalizeDeckLayout(decksRef.current[resolvedIndex] ?? []);
      if (!isDeckBattleReady(layout)) return;

      const playerDeck = getDeckCards(layout);
      battleStartSnapshotRef.current = {
        deckIndex: resolvedIndex,
        playerDeck: structuredClone(playerDeck),
        playerLevel: level,
      };
      setBattlePlayerDeck(playerDeck);
      setActiveDeckIndex(resolvedIndex);
      setLastBattleDeckIndex(resolvedIndex);
      lastBattleDeckIndexRef.current = resolvedIndex;
      activeDeckIndexRef.current = resolvedIndex;
      persistSave({
        activeDeckIndex: resolvedIndex,
        lastBattleDeckIndex: resolvedIndex,
      });
      setCpuDeck(buildBalancedCpuDeck(playerDeck, Math.random, level));
      setCpuOpponent({ name: CPU_OPPONENT_LABEL, level });
      setBattleSetupKey((k) => k + 1);
      setBattleEndDock(false);
      setScreen('battleSetup');
    },
    [clearPracticeRematch, persistSave, user?.level],
  );

  const goToPracticeRematch = useCallback((entry: BattleHistoryEntry) => {
    setIsPracticeRematch(true);
    isPracticeRematchRef.current = true;
    practiceRematchEntryRef.current = entry;
    const playerDeck =
      entry.playerDeck && entry.playerDeck.length >= DECK_MAX
        ? structuredClone(entry.playerDeck)
        : getDeckCards(decksRef.current[activeDeckIndexRef.current] ?? []);
    setBattlePlayerDeck(playerDeck);
    battleStartSnapshotRef.current = null;
    setCpuDeck(structuredClone(entry.opponentDeck));
    setCpuOpponent({ name: CPU_OPPONENT_LABEL, level: entry.opponentLevel });
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
      updateActiveDeck((prev) => {
        const next = normalizeDeckLayout(prev);
        const emptyIndex = next.findIndex((slot) => slot == null);
        if (emptyIndex < 0) return next;
        next[emptyIndex] = card;
        return next;
      });
    },
    [updateActiveDeck],
  );

  const updateCard = useCallback(
    (updated: Card) => {
      updateActiveDeck((prev) =>
        prev.map((c) => (c?.id === updated.id ? updated : c)),
      );
    },
    [updateActiveDeck],
  );

  const deleteCard = useCallback(
    (id: string) => {
      updateActiveDeck((prev) =>
        prev.map((c) => (c?.id === id ? null : c)),
      );
      setFauxLostCardId((prev) => (prev === id ? null : prev));
    },
    [updateActiveDeck],
  );

  const reorderDeck = useCallback(
    (ordered: DeckLayout) => {
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

  const moveCardBetweenDecks = useCallback(
    (
      fromDeckIndex: number,
      fromCardIndex: number,
      toDeckIndex: number,
      toCardIndex: number,
    ) => {
      setDecks((prevDecks) => {
        const movedCardId = prevDecks[fromDeckIndex]?.[fromCardIndex]?.id;
        const nextDecks = moveCardBetweenDeckSlots(
          prevDecks,
          fromDeckIndex,
          fromCardIndex,
          toDeckIndex,
          toCardIndex,
        );
        if (!nextDecks) return prevDecks;
        persistSave({ decks: nextDecks, activeDeckIndex: toDeckIndex });
        setActiveDeckIndex(toDeckIndex);
        if (movedCardId) {
          setDetailCardId((id) => (id === movedCardId ? null : id));
        }
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
    const prevActiveDeck = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
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
      createBattleHistoryEntry(outcome, {
        playerDeck:
          battleStartSnapshotRef.current?.playerDeck ??
          getDeckCards(prevActiveDeck),
        playerLevel:
          battleStartSnapshotRef.current?.playerLevel ??
          prevUser?.level ??
          1,
      }),
    );
    const lastBattleIndex =
      battleStartSnapshotRef.current?.deckIndex ?? deckIndex;
    saveSave({
      user: nextUser,
      decks: nextDecks,
      activeDeckIndex: deckIndex,
      lastBattleDeckIndex: lastBattleIndex,
      unlockedDeckCount: unlockedDeckCountRef.current,
      battleHistory: nextHistory,
    });
    setLastBattleDeckIndex(lastBattleIndex);
    battleStartSnapshotRef.current = null;
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
      lastBattleDeckIndex,
      unlockedDeckCount,
      battleHistory,
    });
    persistSave(next);
    setUser(next.user);
    setDecks(next.decks);
    setActiveDeckIndex(next.activeDeckIndex);
    setLastBattleDeckIndex(next.lastBattleDeckIndex);
    setUnlockedDeckCount(next.unlockedDeckCount);
    setBattleHistory(next.battleHistory ?? []);
    setFauxLostCardId(null);
  }, [activeDeckIndex, battleHistory, decks, lastBattleDeckIndex, persistSave, unlockedDeckCount, user]);

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
      if (tab !== 'deck') {
        setDeckReorderMode(false);
      }
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
            reorderMode={deckReorderMode}
            onReorderModeChange={setDeckReorderMode}
            fauxLostCardId={fauxLostCardId}
            detailCardId={detailCardId}
            onDetailCardIdChange={setDetailCardId}
            onSelectDeckIndex={handleSelectDeckIndex}
            onCreateCard={() => {
              setEditingCard(null);
              setEditorReturnToDetail(false);
              setDetailCardId(null);
              setDeckReorderMode(false);
              setScreen('editor');
            }}
            onEditCard={(card, options) => {
              setEditingCard(card);
              setEditorReturnToDetail(options?.returnToDetail ?? false);
              if (!options?.returnToDetail) {
                setDetailCardId(null);
              }
              setDeckReorderMode(false);
              setScreen('editor');
            }}
            onDeleteCard={deleteCard}
            onReviveFauxLost={(id) => {
              updateActiveDeck((prev) => recordCardRevive(prev, id));
              setFauxLostCardId((prev) => (prev === id ? null : prev));
            }}
            onReorderDeck={reorderDeck}
            onMoveCardBetweenDecks={moveCardBetweenDecks}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen
            decks={decks}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            onStartBattle={goToBattleSetup}
          />
        )}
        {screen === 'records' && (
          <RecordsScreen
            battleHistory={battleHistory}
            deckCount={activeDeckCardCount}
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
            deckCount={activeDeckCardCount}
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
            playerDeck={battlePlayerDeck}
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
