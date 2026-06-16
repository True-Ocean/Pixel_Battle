import { useCallback, useMemo, useRef, useState } from 'react';
import type { AdState, Card, ScreenId, UserProfile, UserEconomy, UserInventory, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry, CPU_OPPONENT_LABEL } from './battleHistory';
import { DECK_SLOT_COUNT, MAX_USER_LEVEL, DECK_MAX } from './config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from './config/devUserLevel';
import { updateDeckAtIndex, clampUnlockedDeckCount, moveCardBetweenDeckSlotsSwap, countDeckCards, getDeckCards, normalizeDeckLayout, isDeckBattleReady, setDeckNameAt, deckHasLostCard, getDeckDisplayName, isDeckSlotUnlocked, resolveDeckUnlockOnLevelUp } from './deckSlots';
import type { DeckLayout } from './types';
import { applyCardSurvivalRecords, applyCardDowngradeRevive, applyCardFullRevive, isCardLost, markCardLost, rescaleDeckBp, applyLimitBreakToCard, canLimitBreakCard, describeLimitBreakResult, type LimitBreakShardSpendPlan } from './card';
import { buildBalancedCpuDeck, buildCpuCardsForDeckFill } from './game/cpuDeck';
import { resolveGraveyardLootCards } from './battle/graveyardLoot';
import { loadSave, resetBattleRecords, saveSave } from './storage';
import { calcBattleExpGainForUser, createInitialProfile, createInitialEconomy, createInitialInventory, createInitialAdState, isProfileComplete, recordUserBattleOutcome, totalExpForLevel, addFreePixels, spendFreePixels, setFreePixels, addLimitBreakShards, spendLimitBreakResources, getUniformAttributeShardsCount, setAllAttributeLimitBreakShards, setTalismanCount, setUniversalLimitBreakShards } from './user';
import { crossedTalismanStarterLevel, isLossEnabledAtUserLevel, shouldGrantTalismanStarterOnDevSetLevel, tryGrantTalismanStarter } from './user/talismanStarter';
import {
  calcCardDeleteRefundPixels,
  calcDowngradeReviveCost,
  calcFullReviveCost,
  calcGraveyardShardReward,
  calcSurvivorPixels,
  calcVictoryBattlePixels,
  countBattleSurvivors,
} from './config/economy';
import { LevelUpModal } from './components/LevelUpModal';
import { LimitBreakSuccessModal } from './components/LimitBreakSuccessModal';
import { GraveyardPickModal } from './components/GraveyardPickModal';
import { LostRouletteModal } from './components/LostRouletteModal';
import { AppTitle } from './components/AppTitle';
import { AppDock } from './components/AppDock';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleHubScreen } from './components/BattleHubScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { RecordsScreen } from './components/RecordsScreen';
import { InventoryScreen } from './components/InventoryScreen';
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
  const [economy, setEconomy] = useState<UserEconomy>(
    () => initialSave.economy ?? createInitialEconomy(),
  );
  const [inventory, setInventory] = useState<UserInventory>(
    () => initialSave.inventory ?? createInitialInventory(),
  );
  const [talismanStarterGranted, setTalismanStarterGranted] = useState(
    () => initialSave.talismanStarterGranted === true,
  );
  const [adState, setAdState] = useState<AdState>(
    () => initialSave.adState ?? createInitialAdState(),
  );
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
  const [deckNames, setDeckNames] = useState<string[] | undefined>(
    () => initialSave.deckNames,
  );

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
  const [pendingGraveyardOutcome, setPendingGraveyardOutcome] =
    useState<BattleOutcome | null>(null);
  const [pendingLostRouletteOutcome, setPendingLostRouletteOutcome] =
    useState<BattleOutcome | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{
    fromLevel: number;
    toLevel: number;
    pixelsGranted: number;
    jewelsGranted: number;
  } | null>(null);
  const [limitBreakSuccessModal, setLimitBreakSuccessModal] = useState<{
    cardName: string;
    previousBp: number;
    newBp: number;
    outcomeLine: string;
  } | null>(null);

  const userRef = useRef(user);
  const economyRef = useRef(economy);
  const inventoryRef = useRef(inventory);
  const talismanStarterGrantedRef = useRef(talismanStarterGranted);
  const adStateRef = useRef(adState);
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
  const settingsReturnScreenRef = useRef<TabId>('deck');
  userRef.current = user;
  economyRef.current = economy;
  inventoryRef.current = inventory;
  talismanStarterGrantedRef.current = talismanStarterGranted;
  adStateRef.current = adState;
  decksRef.current = decks;
  activeDeckIndexRef.current = activeDeckIndex;
  lastBattleDeckIndexRef.current = lastBattleDeckIndex;
  unlockedDeckCountRef.current = unlockedDeckCount;
  battleHistoryRef.current = battleHistory;

  const devPreferSavedLevelRef = useRef(initialSave.devPreferSavedLevel === true);
  const devFileOverrideLevelRef = useRef<number | null | undefined>(
    initialSave.devFileOverrideLevel,
  );

  const persistSave = useCallback(
    (next: {
      user?: UserProfile | null;
      economy?: UserEconomy;
      inventory?: UserInventory;
      adState?: AdState;
      talismanStarterGranted?: boolean;
      decks?: Card[][];
      activeDeckIndex?: number;
      lastBattleDeckIndex?: number;
      unlockedDeckCount?: number;
      battleHistory?: BattleHistoryEntry[];
      deckNames?: string[];
      devPreferSavedLevel?: boolean;
      devFileOverrideLevel?: number | null;
    }) => {
      if (next.devPreferSavedLevel !== undefined) {
        devPreferSavedLevelRef.current = next.devPreferSavedLevel;
      }
      if (next.devFileOverrideLevel !== undefined) {
        devFileOverrideLevelRef.current = next.devFileOverrideLevel;
      }
      saveSave({
        schemaVersion: initialSave.schemaVersion,
        user: next.user !== undefined ? next.user : user,
        economy: next.economy ?? economyRef.current,
        inventory: next.inventory ?? inventoryRef.current,
        adState: next.adState ?? adStateRef.current,
        talismanStarterGranted:
          next.talismanStarterGranted ?? talismanStarterGrantedRef.current,
        decks: next.decks ?? decks,
        activeDeckIndex: next.activeDeckIndex ?? activeDeckIndex,
        lastBattleDeckIndex: next.lastBattleDeckIndex ?? lastBattleDeckIndex,
        unlockedDeckCount: next.unlockedDeckCount ?? unlockedDeckCount,
        battleHistory: next.battleHistory ?? battleHistoryRef.current,
        deckNames: next.deckNames !== undefined ? next.deckNames : deckNames,
        ...(devPreferSavedLevelRef.current
          ? {
              devPreferSavedLevel: true as const,
              devFileOverrideLevel:
                devFileOverrideLevelRef.current ?? DEV_USER_LEVEL_OVERRIDE ?? null,
            }
          : {}),
      });
    },
    [activeDeckIndex, adState, deckNames, decks, economy, inventory, lastBattleDeckIndex, talismanStarterGranted, unlockedDeckCount, user, initialSave.schemaVersion],
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
      const profile = createInitialProfile(username);
      const initialEconomy = createInitialEconomy();
      setUser(profile);
      setEconomy(initialEconomy);
      persistSave({ user: profile, economy: initialEconomy });
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
    goToBattleSetup(lastBattleDeckIndexRef.current);
  }, [goToBattleSetup, goToPracticeRematch]);

  const restartBattleFromEnd = useCallback(() => {
    goToBattleSetup(lastBattleDeckIndexRef.current);
  }, [goToBattleSetup]);

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

  const removeCardFromActiveDeck = useCallback(
    (id: string) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target) return;

      const refundPixels = calcCardDeleteRefundPixels(target);
      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? null : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
      const nextEconomy = addFreePixels(economyRef.current, refundPixels);

      persistSave({ decks: nextDecks, economy: nextEconomy });
      setDecks(nextDecks);
      setEconomy(nextEconomy);
      decksRef.current = nextDecks;
      economyRef.current = nextEconomy;
      setDetailCardId((current) => (current === id ? null : current));
    },
    [persistSave],
  );

  const deleteCard = useCallback(
    (id: string) => removeCardFromActiveDeck(id),
    [removeCardFromActiveDeck],
  );

  const reviveLostCard = useCallback(
    (id: string) => {
      const cost = calcFullReviveCost();
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target || !isCardLost(target)) return;

      const nextEconomy = spendFreePixels(economyRef.current, cost);
      if (!nextEconomy) return;

      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? applyCardFullRevive(card) : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);

      persistSave({ decks: nextDecks, economy: nextEconomy });
      setDecks(nextDecks);
      setEconomy(nextEconomy);
      decksRef.current = nextDecks;
      economyRef.current = nextEconomy;
    },
    [persistSave],
  );

  const downgradeReviveLostCard = useCallback(
    (id: string) => {
      const cost = calcDowngradeReviveCost();
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target || !isCardLost(target)) return;

      const userLevel = userRef.current?.level ?? 1;
      const nextEconomy = spendFreePixels(economyRef.current, cost);
      if (!nextEconomy) return;

      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? applyCardDowngradeRevive(card, userLevel) : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);

      persistSave({ decks: nextDecks, economy: nextEconomy });
      setDecks(nextDecks);
      setEconomy(nextEconomy);
      decksRef.current = nextDecks;
      economyRef.current = nextEconomy;
      setDetailCardId((current) => (current === id ? null : current));
    },
    [persistSave],
  );

  const limitBreakCard = useCallback(
    (id: string, spend: LimitBreakShardSpendPlan) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target || !canLimitBreakCard(target)) return;

      const userLevel = userRef.current?.level ?? 1;
      const spent = spendLimitBreakResources(
        inventoryRef.current,
        target.attribute,
        spend,
      );
      if (!spent) return;

      const upgraded = applyLimitBreakToCard(target, userLevel);
      if (upgraded === target) return;

      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? upgraded : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);

      persistSave({ decks: nextDecks, inventory: spent });
      setDecks(nextDecks);
      setInventory(spent);
      decksRef.current = nextDecks;
      inventoryRef.current = spent;
      setLimitBreakSuccessModal({
        cardName: target.name,
        previousBp: target.bp,
        newBp: upgraded.bp,
        outcomeLine: describeLimitBreakResult(target),
      });
    },
    [persistSave],
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

  const reorderDeckAt = useCallback(
    (deckIndex: number, layout: DeckLayout) => {
      setDecks((prevDecks) => {
        const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, layout);
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
        const nextDecks = moveCardBetweenDeckSlotsSwap(
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

  const moveCardBetweenDecksInHub = useCallback(
    (
      fromDeckIndex: number,
      fromCardIndex: number,
      toDeckIndex: number,
      toCardIndex: number,
    ) => {
      setDecks((prevDecks) => {
        const nextDecks = moveCardBetweenDeckSlotsSwap(
          prevDecks,
          fromDeckIndex,
          fromCardIndex,
          toDeckIndex,
          toCardIndex,
        );
        if (!nextDecks) return prevDecks;
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

  const goToMyDeckWithCard = useCallback(
    (deckIndex: number, cardId: string) => {
      setActiveDeckIndex(deckIndex);
      setDetailCardId(cardId);
      setDeckReorderMode(false);
      setScreen('deck');
      persistSave({ activeDeckIndex: deckIndex });
    },
    [persistSave],
  );

  const finalizeBattleOutcome = useCallback(
    (
      outcome: BattleOutcome,
      options: { graveyardCard?: Card | null; lostCard?: Card | null } = {},
    ) => {
      if (isPracticeRematchRef.current) {
        return;
      }
      const { graveyardCard = null, lostCard = null } = options;
      const prevUser = userRef.current;
      const prevEconomy = economyRef.current;
      const prevDecks = decksRef.current;
      const deckIndex = activeDeckIndexRef.current;
      const prevActiveDeck = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      let nextUser = prevUser;
      let nextEconomy = prevEconomy;
      let nextInventory = inventoryRef.current;
      let nextTalismanStarterGranted = talismanStarterGrantedRef.current;
      let nextUnlockedDeckCount = unlockedDeckCountRef.current;
      if (isProfileComplete(prevUser)) {
        const expInput = {
          winner: outcome.winner,
          opponentDeckPower: outcome.opponentDeckPower,
        };
        const battleRecord = recordUserBattleOutcome(
          prevUser,
          prevEconomy,
          nextInventory,
          expInput,
        );
        nextUser = battleRecord.user;
        nextEconomy = battleRecord.economy;
        nextInventory = battleRecord.inventory;
        if (crossedTalismanStarterLevel(prevUser.level, battleRecord.user.level)) {
          const grant = tryGrantTalismanStarter(
            nextInventory,
            nextTalismanStarterGranted,
          );
          nextInventory = grant.inventory;
          nextTalismanStarterGranted = grant.talismanStarterGranted;
        }
        if (battleRecord.levelsGained.length > 0) {
          nextUnlockedDeckCount = resolveDeckUnlockOnLevelUp(
            nextUnlockedDeckCount,
            battleRecord.levelsGained,
          );
          setLevelUpModal({
            fromLevel: prevUser.level,
            toLevel: battleRecord.user.level,
            pixelsGranted: battleRecord.pixelsGranted,
            jewelsGranted: battleRecord.jewelsGranted,
          });
        }
      }
      if (outcome.winner === 'player') {
        const pixelTotal = graveyardCard
          ? calcVictoryBattlePixels(
              outcome.playerCardIds,
              outcome.defeatedPlayerCardIds,
              graveyardCard,
            ).total
          : calcSurvivorPixels(
              countBattleSurvivors(
                outcome.playerCardIds,
                outcome.defeatedPlayerCardIds,
              ),
            );
        if (pixelTotal > 0) {
          nextEconomy = addFreePixels(nextEconomy, pixelTotal);
        }
        if (graveyardCard) {
          const shardAmount = calcGraveyardShardReward(graveyardCard);
          if (shardAmount > 0) {
            nextInventory = addLimitBreakShards(
              nextInventory,
              graveyardCard.attribute,
              shardAmount,
            );
          }
        }
      }
      let nextActiveDeck = applyCardSurvivalRecords(
        prevActiveDeck,
        outcome.playerCardIds,
        outcome.defeatedPlayerCardIds,
      );
      if (lostCard) {
        nextActiveDeck = nextActiveDeck.map((card) => {
          if (card?.id !== lostCard.id) return card;
          const updated = nextActiveDeck.find((c) => c?.id === lostCard.id);
          return updated ? markCardLost(updated) : markCardLost(lostCard);
        });
      }
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
        schemaVersion: initialSave.schemaVersion,
        user: nextUser,
        economy: nextEconomy,
        inventory: nextInventory,
        adState: adStateRef.current,
        talismanStarterGranted: nextTalismanStarterGranted,
        decks: nextDecks,
        activeDeckIndex: deckIndex,
        lastBattleDeckIndex: lastBattleIndex,
        unlockedDeckCount: nextUnlockedDeckCount,
        battleHistory: nextHistory,
      });
      setLastBattleDeckIndex(lastBattleIndex);
      lastBattleDeckIndexRef.current = lastBattleIndex;
      unlockedDeckCountRef.current = nextUnlockedDeckCount;
      setUnlockedDeckCount(nextUnlockedDeckCount);
      decksRef.current = nextDecks;
      battleStartSnapshotRef.current = null;
      setUser(nextUser);
      setEconomy(nextEconomy);
      setInventory(nextInventory);
      setTalismanStarterGranted(nextTalismanStarterGranted);
      setDecks(nextDecks);
      setBattleHistory(nextHistory);
    },
    [initialSave.schemaVersion],
  );

  const handleBattleOutcome = useCallback(
    (outcome: BattleOutcome) => {
      if (isPracticeRematchRef.current) {
        return;
      }
      if (
        outcome.winner === 'player' &&
        outcome.defeatedCpuCards.length > 0
      ) {
        setPendingGraveyardOutcome(outcome);
        return;
      }
      if (
        outcome.winner === 'cpu' &&
        outcome.defeatedPlayerCards.length > 0
      ) {
        const playerLevel =
          battleStartSnapshotRef.current?.playerLevel ??
          userRef.current?.level ??
          1;
        if (!isLossEnabledAtUserLevel(playerLevel)) {
          finalizeBattleOutcome(outcome, {});
          return;
        }
        setPendingLostRouletteOutcome(outcome);
        return;
      }
      finalizeBattleOutcome(outcome, {});
    },
    [finalizeBattleOutcome],
  );

  const handleGraveyardPick = useCallback(
    (card: Card) => {
      const outcome = pendingGraveyardOutcome;
      if (!outcome) return;
      setPendingGraveyardOutcome(null);
      finalizeBattleOutcome(outcome, { graveyardCard: card });
    },
    [finalizeBattleOutcome, pendingGraveyardOutcome],
  );

  const handleLostRouletteComplete = useCallback(
    (card: Card) => {
      const outcome = pendingLostRouletteOutcome;
      if (!outcome) return;
      setPendingLostRouletteOutcome(null);
      finalizeBattleOutcome(outcome, { lostCard: card });
    },
    [finalizeBattleOutcome, pendingLostRouletteOutcome],
  );

  const handleBattleEndedChange = useCallback((ended: boolean) => {
    setBattleEndDock(ended);
  }, []);

  const handleResetBattleRecords = useCallback(() => {
    const next = resetBattleRecords({
      schemaVersion: initialSave.schemaVersion,
      user,
      economy,
      inventory,
      adState,
      talismanStarterGranted,
      decks,
      activeDeckIndex,
      lastBattleDeckIndex,
      unlockedDeckCount,
      deckNames,
      battleHistory,
    });
    persistSave(next);
    setUser(next.user);
    setEconomy(next.economy ?? createInitialEconomy());
    setInventory(next.inventory ?? createInitialInventory());
    setTalismanStarterGranted(next.talismanStarterGranted === true);
    setAdState(next.adState ?? createInitialAdState());
    setDecks(next.decks);
    setActiveDeckIndex(next.activeDeckIndex);
    setLastBattleDeckIndex(next.lastBattleDeckIndex);
    setUnlockedDeckCount(next.unlockedDeckCount);
    setBattleHistory(next.battleHistory ?? []);
    setLevelUpModal(null);
    setPendingGraveyardOutcome(null);
    setPendingLostRouletteOutcome(null);
  }, [activeDeckIndex, adState, battleHistory, deckNames, decks, economy, initialSave.schemaVersion, inventory, lastBattleDeckIndex, persistSave, talismanStarterGranted, unlockedDeckCount, user]);

  const handleDevSetLevel = useCallback(
    (level: number): string => {
      const currentUser = userRef.current;
      if (!import.meta.env.DEV || !isProfileComplete(currentUser)) {
        return '開発メニューは利用できません。';
      }
      const clamped = Math.max(1, Math.min(MAX_USER_LEVEL, Math.floor(level)));
      const nextUser = {
        ...currentUser,
        level: clamped,
        exp: totalExpForLevel(clamped),
      };
      const currentDecks = decksRef.current;
      const nextDecks = currentDecks.map((deck) => {
        const cards = getDeckCards(deck);
        const rescaled = rescaleDeckBp(cards, clamped);
        const next = normalizeDeckLayout(deck);
        let cursor = 0;
        return next.map((card) => {
          if (card == null) return null;
          const updated = rescaled[cursor];
          cursor += 1;
          return updated ?? card;
        });
      });
      let nextInventory = inventoryRef.current;
      let nextTalismanStarterGranted = talismanStarterGrantedRef.current;
      let notice = `Lv.${clamped} に変更しました。既存カードの BP も再算出されます。`;
      if (shouldGrantTalismanStarterOnDevSetLevel(clamped, nextTalismanStarterGranted)) {
        const grant = tryGrantTalismanStarter(nextInventory, nextTalismanStarterGranted);
        nextInventory = grant.inventory;
        nextTalismanStarterGranted = grant.talismanStarterGranted;
        notice += ' 護符を1個配布しました。';
      }
      persistSave({
        user: nextUser,
        decks: nextDecks,
        inventory: nextInventory,
        talismanStarterGranted: nextTalismanStarterGranted,
        devPreferSavedLevel: true,
        devFileOverrideLevel: DEV_USER_LEVEL_OVERRIDE,
      });
      setUser(nextUser);
      setDecks(nextDecks);
      setInventory(nextInventory);
      setTalismanStarterGranted(nextTalismanStarterGranted);
      return notice;
    },
    [persistSave],
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

  const handleDevSetFreePixels = useCallback(
    (amount: number) => {
      if (!import.meta.env.DEV) return;
      const nextEconomy = setFreePixels(economyRef.current, amount);
      persistSave({ economy: nextEconomy });
      setEconomy(nextEconomy);
      economyRef.current = nextEconomy;
    },
    [persistSave],
  );

  const handleDevSetAttributeShards = useCallback((count: number): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const nextInventory = setAllAttributeLimitBreakShards(
      inventoryRef.current,
      count,
    );
    persistSave({ inventory: nextInventory });
    setInventory(nextInventory);
    inventoryRef.current = nextInventory;
    return `全属性かけらを ${count.toLocaleString()} 個にしました。`;
  }, [persistSave]);

  const handleDevSetUniversalShards = useCallback((count: number): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const nextInventory = setUniversalLimitBreakShards(
      inventoryRef.current,
      count,
    );
    persistSave({ inventory: nextInventory });
    setInventory(nextInventory);
    inventoryRef.current = nextInventory;
    return `汎用かけらを ${count.toLocaleString()} 個にしました。`;
  }, [persistSave]);

  const handleDevSetTalisman = useCallback((count: number): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const nextInventory = setTalismanCount(inventoryRef.current, count);
    persistSave({ inventory: nextInventory });
    setInventory(nextInventory);
    inventoryRef.current = nextInventory;
    return `護符を ${count.toLocaleString()} 個にしました。`;
  }, [persistSave]);

  const devCardOptions = useMemo(() => {
    const options: { id: string; label: string; isLost: boolean }[] = [];
    decks.forEach((deck, deckIndex) => {
      const deckName = getDeckDisplayName(deckIndex, deckNames);
      for (const card of normalizeDeckLayout(deck ?? [])) {
        if (!card) continue;
        options.push({
          id: card.id,
          label: `${deckName} · ${card.name}${isCardLost(card) ? ' · Lost' : ''}`,
          isLost: isCardLost(card),
        });
      }
    });
    return options;
  }, [decks, deckNames]);

  const devDeckFillOptions = useMemo(() => {
    return Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
      const layout = normalizeDeckLayout(decks[index] ?? []);
      const cardCount = countDeckCards(layout);
      return {
        index,
        label: `${getDeckDisplayName(index, deckNames)}（${cardCount}/${DECK_MAX}）`,
        emptySlots: DECK_MAX - cardCount,
        locked: !isDeckSlotUnlocked(index, unlockedDeckCount),
      };
    });
  }, [decks, deckNames, unlockedDeckCount]);

  const handleDevMarkCardLost = useCallback((cardId: string): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    if (!cardId) {
      return 'カードを選択してください。';
    }
    const currentDecks = decksRef.current;
    let target: Card | null = null;
    for (const deck of currentDecks) {
      for (const card of normalizeDeckLayout(deck ?? [])) {
        if (card?.id === cardId) {
          target = card;
          break;
        }
      }
      if (target) break;
    }
    if (!target) {
      return '選択したカードが見つかりません。';
    }
    if (isCardLost(target)) {
      return `「${target.name}」はすでに Lost です。`;
    }
    const nextDecks = currentDecks.map((deck) =>
      normalizeDeckLayout(deck ?? []).map((card) =>
        card?.id === cardId ? markCardLost(card) : card,
      ),
    );
    persistSave({ decks: nextDecks });
    setDecks(nextDecks);
    decksRef.current = nextDecks;
    return `「${target.name}」を Lost にしました。`;
  }, [persistSave]);

  const handleDevFillDeckSlots = useCallback((deckIndex: number): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const index = Math.floor(deckIndex);
    if (index < 0 || index >= DECK_SLOT_COUNT) {
      return 'デッキを選択してください。';
    }
    if (!isDeckSlotUnlocked(index, unlockedDeckCountRef.current)) {
      return `${getDeckDisplayName(index, deckNames)} は未解放です。開発メニューのデッキ解放数から解放してください。`;
    }
    const currentDecks = decksRef.current;
    const layout = normalizeDeckLayout(currentDecks[index] ?? []);
    const existingCards = getDeckCards(layout);
    const emptySlots = DECK_MAX - existingCards.length;
    if (emptySlots <= 0) {
      return `${getDeckDisplayName(index, deckNames)} に空きスロットがありません。`;
    }
    const userLevel = userRef.current?.level ?? 1;
    const newCards = buildCpuCardsForDeckFill(
      existingCards,
      emptySlots,
      Math.random,
      userLevel,
    );
    if (newCards.length === 0) {
      return 'カードを生成できませんでした。';
    }
    let insertAt = 0;
    const nextLayout = layout.map((slot) => {
      if (slot != null) return slot;
      const card = newCards[insertAt];
      insertAt += 1;
      return card ?? null;
    });
    const nextDecks = updateDeckAtIndex(currentDecks, index, nextLayout);
    persistSave({ decks: nextDecks });
    setDecks(nextDecks);
    decksRef.current = nextDecks;
    const deckLabel = getDeckDisplayName(index, deckNames);
    return `${deckLabel} の空き ${newCards.length} 枚に CPU 風カードを追加しました。`;
  }, [deckNames, persistSave]);

  const handlePrototypeUnlockNextDeck = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const nextCount = clampUnlockedDeckCount(unlockedDeckCountRef.current + 1);
    const nextIndex = nextCount - 1;
    setUnlockedDeckCount(nextCount);
    setActiveDeckIndex(nextIndex);
    setDetailCardId(null);
    persistSave({
      unlockedDeckCount: nextCount,
      activeDeckIndex: nextIndex,
    });
  }, [persistSave]);

  const handleRenameDeck = useCallback(
    (deckIndex: number, name: string) => {
      const nextDeckNames = setDeckNameAt(deckNames, deckIndex, name);
      setDeckNames(nextDeckNames);
      persistSave({ deckNames: nextDeckNames });
    },
    [deckNames, persistSave],
  );

  const completeTitle = useCallback(() => {
    setScreen(initialScreen(user));
    setEnterFromTitle(true);
  }, [user]);

  const pendingBattleExpGain = useMemo(() => {
    if (!pendingGraveyardOutcome || !isProfileComplete(user)) return 0;
    return calcBattleExpGainForUser(user, {
      winner: pendingGraveyardOutcome.winner,
      opponentDeckPower: pendingGraveyardOutcome.opponentDeckPower,
    });
  }, [pendingGraveyardOutcome, user]);

  const battleEndNewBattleDisabled = useMemo(() => {
    if (pendingLostRouletteOutcome != null) return true;
    const deckIndex = lastBattleDeckIndex;
    return deckHasLostCard(normalizeDeckLayout(decks[deckIndex] ?? []));
  }, [decks, lastBattleDeckIndex, pendingLostRouletteOutcome]);

  const showProfileBar = isProfileComplete(user) && isTabId(screen);
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

  const openSettings = useCallback(() => {
    if (isTabId(screen)) {
      settingsReturnScreenRef.current = screen;
    }
    setScreen('settings');
  }, [screen]);

  const closeSettings = useCallback(() => {
    setScreen(settingsReturnScreenRef.current);
  }, []);

  return (
    <div className={`app app-screen-${screen}${showDock ? ' has-dock' : ''}`}>
      {screen === 'setup' && (
        <header className="app-header app-header-setup">
          <div className="app-brand">
            <AppTitle />
          </div>
        </header>
      )}

      {showProfileBar && user && (
        <header className="app-header app-header--profile">
          <UserProfileBar
            user={user}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            onOpenSettings={openSettings}
          />
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
            userLevel={user?.level ?? 1}
            deckNames={deckNames}
            reorderMode={deckReorderMode}
            onReorderModeChange={setDeckReorderMode}
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
            onReviveLostCard={reviveLostCard}
            onDowngradeReviveLostCard={downgradeReviveLostCard}
            inventory={inventory}
            onLimitBreakCard={limitBreakCard}
            freePixels={economy.freePixels}
            reviveCost={calcFullReviveCost()}
            downgradeReviveCost={calcDowngradeReviveCost()}
            onReorderDeck={reorderDeck}
            onMoveCardBetweenDecks={moveCardBetweenDecks}
            onPrototypeUnlockDeck={handlePrototypeUnlockNextDeck}
            onRenameDeck={handleRenameDeck}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            onStartBattle={goToBattleSetup}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
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
        {screen === 'inventory' && (
          <InventoryScreen inventory={inventory} />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            user={user}
            unlockedDeckCount={unlockedDeckCount}
            freePixels={economy.freePixels}
            attributeShardsCount={getUniformAttributeShardsCount(inventory)}
            universalShardCount={inventory.limitBreakUniversal}
            talismanCount={inventory.talisman}
            onBack={closeSettings}
            devCardOptions={devCardOptions}
            devDeckFillOptions={devDeckFillOptions}
            onResetBattleRecords={handleResetBattleRecords}
            onDevSetLevel={handleDevSetLevel}
            onDevSetUnlockedDeckCount={handleDevSetUnlockedDeckCount}
            onDevSetFreePixels={handleDevSetFreePixels}
            onDevSetAttributeShards={handleDevSetAttributeShards}
            onDevSetUniversalShards={handleDevSetUniversalShards}
            onDevSetTalisman={handleDevSetTalisman}
            onDevMarkCardLost={handleDevMarkCardLost}
            onDevFillDeckSlots={handleDevFillDeckSlots}
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
            onFinish={handleBattleOutcome}
            onNewBattle={
              isPracticeRematch ? rematchSameOpponent : restartBattleFromEnd
            }
            newBattleDisabled={battleEndNewBattleDisabled}
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
      {levelUpModal && (
        <LevelUpModal
          fromLevel={levelUpModal.fromLevel}
          toLevel={levelUpModal.toLevel}
          totalPixelsGranted={levelUpModal.pixelsGranted}
          totalJewelsGranted={levelUpModal.jewelsGranted}
          onClose={() => setLevelUpModal(null)}
        />
      )}
      {limitBreakSuccessModal && (
        <LimitBreakSuccessModal
          cardName={limitBreakSuccessModal.cardName}
          previousBp={limitBreakSuccessModal.previousBp}
          newBp={limitBreakSuccessModal.newBp}
          outcomeLine={limitBreakSuccessModal.outcomeLine}
          onClose={() => setLimitBreakSuccessModal(null)}
        />
      )}
      {pendingGraveyardOutcome && (
        <GraveyardPickModal
          survivorCards={pendingGraveyardOutcome.survivorPlayerCards}
          graveyardCards={resolveGraveyardLootCards(pendingGraveyardOutcome)}
          expGain={pendingBattleExpGain}
          onPick={handleGraveyardPick}
        />
      )}
      {pendingLostRouletteOutcome && (
        <LostRouletteModal
          cards={pendingLostRouletteOutcome.defeatedPlayerCards}
          onComplete={handleLostRouletteComplete}
        />
      )}
    </div>
  );
}

export default App;
