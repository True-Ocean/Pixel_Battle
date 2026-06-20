import { useCallback, useMemo, useRef, useState } from 'react';
import type { AdState, Card, ScreenId, UserProfile, UserEconomy, UserInventory, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry, CPU_OPPONENT_LABEL } from './battleHistory';
import { DECK_SLOT_COUNT, MAX_USER_LEVEL, DECK_MAX } from './config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from './config/devUserLevel';
import { updateDeckAtIndex, clampUnlockedDeckCount, moveCardBetweenDeckSlotsSwap, countDeckCards, getDeckCards, normalizeDeckLayout, isDeckBattleReady, setDeckNameAt, deckHasLostCard, getDeckDisplayName, isDeckSlotUnlocked, isDeckNameTakenByOtherDeck, resolveDeckUnlockOnLevelUp, hasHistoryRematchDeck, canUnlockDeckSlotWithJewels } from './deckSlots';
import type { DeckLayout } from './types';
import { applyCardSurvivalRecords, applyCardDowngradeRevive, applyCardFullRevive, consumeTalismanFromCard, countEquippedTalismans, isCardLost, isTalismanEquipped, markCardLost, rescaleDeckBp, applyLimitBreakToCard, canLimitBreakCard, describeLimitBreakRaritySuccessTitle, describeLimitBreakResult, getLimitBreakOutcomeKind, finalizeCardNameForCreation, tryEquipTalismanInDeck, tryUnequipTalismanInDeck, type LimitBreakShardSpendPlan } from './card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired, BATTLE_MATCH_CANCEL_COST } from './config/economy';
import { buildBalancedCpuDeck, buildCpuCardsForDeckFill } from './game/cpuDeck';
import { resolveGraveyardLootCards } from './battle/graveyardLoot';
import { loadSave, resetBattleHistory, saveSave } from './storage';
import { calcBattleExpGainForUser, createInitialProfile, createInitialEconomy, createInitialInventory, createInitialAdState, isProfileComplete, recordUserBattleOutcome, totalExpForLevel, addFreePixels, spendFreePixels, setFreePixels, setJewels, addLimitBreakShards, addInventoryCount, spendLimitBreakResources, spendJewels, getUniformAttributeShardsCount, setAllAttributeLimitBreakShards, setTalismanCount, setUniversalLimitBreakShards, isNormalBattleAdsEnabledAtUserLevel, shouldRequireHistoryRematchAd, shouldRequireNormalBattleAd, shouldShowHistoryRematchRulesModal, dismissHistoryRematchRulesForToday } from './user';
import { prepareHistoryOpponentDeck } from './historyRematch';
import {
  unlockPaletteWithJewels,
  unlockPaletteWithPixels,
  createFullPaletteShopUnlocks,
} from './user/paletteShop';
import { normalizePaletteShopUnlocks } from './config/paletteUnlock';
import { crossedTalismanStarterLevel, isLossEnabledAtUserLevel, shouldGrantTalismanStarterOnDevSetLevel, tryGrantTalismanStarter } from './user/talismanStarter';
import {
  calcDowngradeReviveCost,
  calcFullReviveCost,
  calcGraveyardShardReward,
  calcLostCardDeleteRewards,
  calcSurvivorPixels,
  calcVictoryBattlePixels,
  countBattleSurvivors,
  JEWEL_COST_DELETE,
  JEWEL_COST_RENAME,
  JEWEL_COST_DECK_UNLOCK,
  PIXEL_COST_RENAME_FIRST,
  getCardRenameCount,
  isFirstCardRename,
} from './config/economy';
import { LevelUpModal } from './components/LevelUpModal';
import { LimitBreakSuccessModal } from './components/LimitBreakSuccessModal';
import { GraveyardPickModal } from './components/GraveyardPickModal';
import { LostRouletteModal } from './components/LostRouletteModal';
import { TalismanSaveModal } from './components/TalismanSaveModal';
import { AppTitle } from './components/AppTitle';
import { AppDock } from './components/AppDock';
import { DeckScreen } from './components/DeckScreen';
import { EditorScreen } from './components/EditorScreen';
import { BattleHubScreen } from './components/BattleHubScreen';
import { BattleDeckSelectScreen } from './components/BattleDeckSelectScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { MockRewardAdModal } from './components/MockRewardAdModal';
import { HistoryRematchRulesModal } from './components/HistoryRematchRulesModal';
import { RecordsScreen } from './components/RecordsScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ShopScreen } from './components/ShopScreen';
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
  const [paletteShopUnlocks, setPaletteShopUnlocks] = useState<number[]>(() =>
    normalizePaletteShopUnlocks(initialSave.paletteShopUnlocks),
  );

  const activeDeck = useMemo(
    () => normalizeDeckLayout(decks[activeDeckIndex] ?? []),
    [activeDeckIndex, decks],
  );

  const activeDeckCardCount = useMemo(
    () => countDeckCards(activeDeck),
    [activeDeck],
  );

  const equippedTalismanCount = useMemo(
    () => countEquippedTalismans(decks),
    [decks],
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
  const [battleHubResetKey, setBattleHubResetKey] = useState(0);
  const [battleEndDock, setBattleEndDock] = useState(false);
  const [isHistoryRematch, setIsHistoryRematch] = useState(false);
  const [historyRematchFlow, setHistoryRematchFlow] = useState<{
    entry: BattleHistoryEntry;
    phase: 'rules' | 'deckSelect';
  } | null>(null);
  const [historyRematchPendingAdDeckIndex, setHistoryRematchPendingAdDeckIndex] =
    useState<number | null>(null);
  const [normalBattlePendingAdDeckIndex, setNormalBattlePendingAdDeckIndex] =
    useState<number | null>(null);
  const [graveyardVictoryDoubleCard, setGraveyardVictoryDoubleCard] =
    useState<Card | null>(null);
  const [cardEditPendingAd, setCardEditPendingAd] = useState<Card | null>(null);
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
  const [pendingTalismanSave, setPendingTalismanSave] = useState<{
    outcome: BattleOutcome;
    card: Card;
  } | null>(null);
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
    title?: string;
    outcomeLine?: string;
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
  const deckNamesRef = useRef(deckNames);
  const paletteShopUnlocksRef = useRef(paletteShopUnlocks);
  const isHistoryRematchRef = useRef(false);
  const historyRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
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
  deckNamesRef.current = deckNames;
  paletteShopUnlocksRef.current = paletteShopUnlocks;

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
      paletteShopUnlocks?: number[];
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
        deckNames: next.deckNames !== undefined ? next.deckNames : deckNamesRef.current,
        paletteShopUnlocks:
          next.paletteShopUnlocks ?? paletteShopUnlocksRef.current,
        ...(devPreferSavedLevelRef.current
          ? {
              devPreferSavedLevel: true as const,
              devFileOverrideLevel:
                devFileOverrideLevelRef.current ?? DEV_USER_LEVEL_OVERRIDE ?? null,
            }
          : {}),
      });
    },
    [activeDeckIndex, adState, decks, economy, inventory, lastBattleDeckIndex, paletteShopUnlocks, talismanStarterGranted, unlockedDeckCount, user, initialSave.schemaVersion],
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

  const clearHistoryRematch = useCallback(() => {
    setIsHistoryRematch(false);
    isHistoryRematchRef.current = false;
    historyRematchEntryRef.current = null;
  }, []);

  const resetHistoryRematchFlow = useCallback(() => {
    setHistoryRematchFlow(null);
    setHistoryRematchPendingAdDeckIndex(null);
  }, []);

  const goToBattleSetup = useCallback(
    (deckIndex?: number) => {
      clearHistoryRematch();
      resetHistoryRematchFlow();
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
      if (isNormalBattleAdsEnabledAtUserLevel(level)) {
        const nextAdState = {
          ...adStateRef.current,
          normalBattleStarts: (adStateRef.current.normalBattleStarts ?? 0) + 1,
        };
        adStateRef.current = nextAdState;
        setAdState(nextAdState);
        persistSave({ adState: nextAdState });
      }
      setBattleSetupKey((k) => k + 1);
      setBattleEndDock(false);
      setScreen('battleSetup');
    },
    [clearHistoryRematch, resetHistoryRematchFlow, persistSave, user?.level],
  );

  const requestGoToBattleSetup = useCallback(
    (deckIndex: number) => {
      const level = userRef.current?.level ?? 1;
      if (
        isNormalBattleAdsEnabledAtUserLevel(level) &&
        shouldRequireNormalBattleAd(adStateRef.current.normalBattleStarts ?? 0)
      ) {
        setNormalBattlePendingAdDeckIndex(deckIndex);
        return;
      }
      goToBattleSetup(deckIndex);
    },
    [goToBattleSetup],
  );

  const handleCancelBattleMatch = useCallback(() => {
    const nextEconomy = spendFreePixels(
      economyRef.current,
      BATTLE_MATCH_CANCEL_COST,
    );
    if (!nextEconomy) return;

    persistSave({ economy: nextEconomy });
    setEconomy(nextEconomy);
    economyRef.current = nextEconomy;
    setBattleEndDock(false);
    clearHistoryRematch();
    setBattleSetupKey((key) => key + 1);
    setBattleHubResetKey((key) => key + 1);
    setScreen('battleHub');
  }, [clearHistoryRematch, persistSave]);

  const continueHistoryRematch = useCallback(
    (entry: BattleHistoryEntry) => {
      if (screen !== 'records') {
        setScreen('records');
      }
      setHistoryRematchFlow({ entry, phase: 'deckSelect' });
    },
    [screen],
  );

  const requestHistoryRematch = useCallback(
    (entry: BattleHistoryEntry) => {
      historyRematchEntryRef.current = entry;
      if (shouldShowHistoryRematchRulesModal(adStateRef.current)) {
        setHistoryRematchFlow({ entry, phase: 'rules' });
        return;
      }
      continueHistoryRematch(entry);
    },
    [continueHistoryRematch],
  );

  const proceedHistoryRematchAfterRules = useCallback(
    ({ suppressToday }: { suppressToday: boolean }) => {
      const entry =
        historyRematchFlow?.entry ?? historyRematchEntryRef.current;
      if (!entry) return;

      if (suppressToday) {
        const nextAdState = dismissHistoryRematchRulesForToday(
          adStateRef.current,
        );
        adStateRef.current = nextAdState;
        setAdState(nextAdState);
        persistSave({ adState: nextAdState });
      }

      continueHistoryRematch(entry);
    },
    [continueHistoryRematch, historyRematchFlow, persistSave],
  );

  const executeHistoryRematchBattle = useCallback(
    (deckIndex: number) => {
      const entry =
        historyRematchFlow?.entry ?? historyRematchEntryRef.current;
      if (!entry) return;

      const level = userRef.current?.level ?? 1;
      const layout = normalizeDeckLayout(decksRef.current[deckIndex] ?? []);
      const playerDeck = getDeckCards(layout);

      setIsHistoryRematch(true);
      isHistoryRematchRef.current = true;
      historyRematchEntryRef.current = entry;
      setBattlePlayerDeck(playerDeck);
      battleStartSnapshotRef.current = null;
      setCpuDeck(prepareHistoryOpponentDeck(entry.opponentDeck, level));
      setCpuOpponent({ name: CPU_OPPONENT_LABEL, level });

      const nextAdState = {
        ...adStateRef.current,
        historyRematchStarts: (adStateRef.current.historyRematchStarts ?? 0) + 1,
      };
      adStateRef.current = nextAdState;
      setAdState(nextAdState);
      persistSave({ adState: nextAdState });

      setHistoryRematchPendingAdDeckIndex(null);
      resetHistoryRematchFlow();
      setBattleSetupKey((k) => k + 1);
      setBattleEndDock(false);
      setScreen('battleSetup');
    },
    [historyRematchFlow, persistSave, resetHistoryRematchFlow],
  );

  const startHistoryRematchBattle = useCallback(
    (deckIndex: number) => {
      const starts = adStateRef.current.historyRematchStarts ?? 0;
      if (shouldRequireHistoryRematchAd(starts)) {
        setHistoryRematchPendingAdDeckIndex(deckIndex);
        return;
      }
      executeHistoryRematchBattle(deckIndex);
    },
    [executeHistoryRematchBattle],
  );

  const rematchSameOpponent = useCallback(() => {
    const entry = historyRematchEntryRef.current;
    if (entry) {
      requestHistoryRematch(entry);
      return;
    }
    requestGoToBattleSetup(lastBattleDeckIndexRef.current);
  }, [requestGoToBattleSetup, requestHistoryRematch]);

  const restartBattleFromEnd = useCallback(() => {
    requestGoToBattleSetup(lastBattleDeckIndexRef.current);
  }, [requestGoToBattleSetup]);

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
    (updated: Card, options?: { canvasUpgradePx?: number }) => {
      const upgradePx = options?.canvasUpgradePx ?? 0;
      let nextEconomy = economyRef.current;
      if (upgradePx > 0) {
        const spent = spendFreePixels(economyRef.current, upgradePx);
        if (!spent) return;
        nextEconomy = spent;
      }

      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const nextLayout = prevLayout.map((card) =>
        card?.id === updated.id ? updated : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
      setDecks(nextDecks);
      decksRef.current = nextDecks;
      setEditingCard(updated);

      if (upgradePx > 0) {
        setEconomy(nextEconomy);
        economyRef.current = nextEconomy;
        persistSave({ decks: nextDecks, economy: nextEconomy });
      } else {
        persistSave({ decks: nextDecks });
      }
    },
    [persistSave],
  );

  const renameDeckCard = useCallback(
    (cardId: string, newName: string): string | null => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === cardId);
      if (!target) return 'カードが見つかりません。';

      const trimmed = finalizeCardNameForCreation(newName);
      if (trimmed === target.name.trim()) {
        return '現在と異なる名前を入力してください。';
      }

      const renameCount = getCardRenameCount(target);
      const nextEconomy = isFirstCardRename(renameCount)
        ? spendFreePixels(economyRef.current, PIXEL_COST_RENAME_FIRST)
        : spendJewels(economyRef.current, JEWEL_COST_RENAME);
      if (!nextEconomy) {
        return isFirstCardRename(renameCount)
          ? `px が ${PIXEL_COST_RENAME_FIRST.toLocaleString()} 不足しています。`
          : `ジュエルが ${JEWEL_COST_RENAME} 不足しています。`;
      }

      const updated: Card = {
        ...target,
        name: trimmed,
        renameCount: renameCount + 1,
      };
      const nextLayout = prevLayout.map((card) =>
        card?.id === cardId ? updated : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
      setDecks(nextDecks);
      decksRef.current = nextDecks;
      setEconomy(nextEconomy);
      economyRef.current = nextEconomy;
      setEditingCard(updated);
      persistSave({ decks: nextDecks, economy: nextEconomy });
      return null;
    },
    [persistSave],
  );

  const removeCardFromDeck = useCallback((id: string) => {
    const deckIndex = activeDeckIndexRef.current;
    const prevDecks = decksRef.current;
    const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
    const nextLayout = prevLayout.map((card) => (card?.id === id ? null : card));
    const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
    setDecks(nextDecks);
    decksRef.current = nextDecks;
    setDetailCardId((current) => (current === id ? null : current));
    return nextDecks;
  }, []);

  const deleteDeckCard = useCallback(
    (id: string) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target) return;

      const nextEconomy = spendJewels(economyRef.current, JEWEL_COST_DELETE);
      if (!nextEconomy) return;

      const { pixels, shards } = calcLostCardDeleteRewards(target);
      const economyAfter = addFreePixels(nextEconomy, pixels);
      let inventoryAfter = inventoryRef.current;
      if (isTalismanEquipped(target)) {
        inventoryAfter = addInventoryCount(inventoryAfter, 'talisman', 1);
      }
      if (shards > 0) {
        inventoryAfter = addLimitBreakShards(
          inventoryAfter,
          target.attribute,
          shards,
        );
      }

      const nextDecks = removeCardFromDeck(id);
      persistSave({
        decks: nextDecks,
        economy: economyAfter,
        inventory: inventoryAfter,
      });
      setEconomy(economyAfter);
      setInventory(inventoryAfter);
      economyRef.current = economyAfter;
      inventoryRef.current = inventoryAfter;
    },
    [persistSave, removeCardFromDeck],
  );

  const equipTalismanOnCard = useCallback(
    (id: string) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const result = tryEquipTalismanInDeck(
        prevLayout,
        id,
        inventoryRef.current,
      );
      if (!result) return;

      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, result.deck);
      persistSave({ decks: nextDecks, inventory: result.inventory });
      setDecks(nextDecks);
      setInventory(result.inventory);
      decksRef.current = nextDecks;
      inventoryRef.current = result.inventory;
    },
    [persistSave],
  );

  const unequipTalismanOnCard = useCallback(
    (id: string) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const result = tryUnequipTalismanInDeck(
        prevLayout,
        id,
        inventoryRef.current,
      );
      if (!result) return;

      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, result.deck);
      persistSave({ decks: nextDecks, inventory: result.inventory });
      setDecks(nextDecks);
      setInventory(result.inventory);
      decksRef.current = nextDecks;
      inventoryRef.current = result.inventory;
    },
    [persistSave],
  );

  const reviveLostCard = useCallback(
    (id: string) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target || !isCardLost(target)) return;

      const cost = calcFullReviveCost(target);
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
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target || !isCardLost(target)) return;

      const cost = calcDowngradeReviveCost(target);
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
      const outcomeKind = getLimitBreakOutcomeKind(target);
      if (outcomeKind === 'rarity') {
        const jewelCost = getLimitBreakRarityJewelCost(target.rarity);
        if (!jewelCost || economyRef.current.jewels < jewelCost) return;
      }

      const spent = spendLimitBreakResources(
        inventoryRef.current,
        target.attribute,
        spend,
        getLimitBreakShardsRequired(target.rarity),
      );
      if (!spent) return;

      let nextEconomy = economyRef.current;
      if (outcomeKind === 'rarity') {
        const jewelCost = getLimitBreakRarityJewelCost(target.rarity);
        if (!jewelCost) return;
        const spentEconomy = spendJewels(nextEconomy, jewelCost);
        if (!spentEconomy) return;
        nextEconomy = spentEconomy;
      }

      const upgraded = applyLimitBreakToCard(target, userLevel);
      if (upgraded === target) return;

      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? upgraded : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);

      persistSave({ decks: nextDecks, inventory: spent, economy: nextEconomy });
      setDecks(nextDecks);
      setInventory(spent);
      setEconomy(nextEconomy);
      decksRef.current = nextDecks;
      inventoryRef.current = spent;
      economyRef.current = nextEconomy;
      setLimitBreakSuccessModal({
        cardName: target.name,
        previousBp: target.bp,
        newBp: upgraded.bp,
        title:
          outcomeKind === 'rarity'
            ? describeLimitBreakRaritySuccessTitle(target) ?? undefined
            : undefined,
        outcomeLine:
          outcomeKind === 'star' ? describeLimitBreakResult(target) : undefined,
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
      options: {
        graveyardCard?: Card | null;
        lostCard?: Card | null;
        talismanSavedCard?: Card | null;
        doubleVictoryPixels?: boolean;
      } = {},
    ) => {
      if (isHistoryRematchRef.current) {
        return;
      }
      const {
        graveyardCard = null,
        lostCard = null,
        talismanSavedCard = null,
        doubleVictoryPixels = false,
      } = options;
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
          const pixelsToGrant = doubleVictoryPixels ? pixelTotal * 2 : pixelTotal;
          nextEconomy = addFreePixels(nextEconomy, pixelsToGrant);
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
      if (talismanSavedCard) {
        nextActiveDeck = nextActiveDeck.map((card) => {
          if (card?.id !== talismanSavedCard.id) return card;
          const updated = nextActiveDeck.find((c) => c?.id === talismanSavedCard.id);
          return consumeTalismanFromCard(updated ?? talismanSavedCard);
        });
      }
      let nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextActiveDeck);
      if (nextUser && nextUser.level > (prevUser?.level ?? 1)) {
        const newLevel = nextUser.level;
        nextDecks = nextDecks.map((deck) => {
          const cards = getDeckCards(deck);
          const rescaled = rescaleDeckBp(
            cards,
            newLevel,
            paletteShopUnlocksRef.current,
          );
          const normalized = normalizeDeckLayout(deck);
          let cursor = 0;
          return normalized.map((card) => {
            if (card == null) return null;
            const updated = rescaled[cursor];
            cursor += 1;
            return updated ?? card;
          });
        });
      }
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
        deckNames: deckNamesRef.current,
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

  const finalizeHistoryRematchOutcome = useCallback(
    (outcome: BattleOutcome) => {
      if (outcome.winner !== 'player') return;

      const pixelTotal = calcSurvivorPixels(
        countBattleSurvivors(
          outcome.playerCardIds,
          outcome.defeatedPlayerCardIds,
        ),
      );
      if (pixelTotal <= 0) return;

      const nextEconomy = addFreePixels(economyRef.current, pixelTotal);
      economyRef.current = nextEconomy;
      setEconomy(nextEconomy);
      persistSave({ economy: nextEconomy, adState: adStateRef.current });
    },
    [persistSave],
  );

  const handleBattleOutcome = useCallback(
    (outcome: BattleOutcome) => {
      if (isHistoryRematchRef.current) {
        finalizeHistoryRematchOutcome(outcome);
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
    [finalizeBattleOutcome, finalizeHistoryRematchOutcome],
  );

  const handleGraveyardPick = useCallback(
    (card: Card, options?: { doublePixels?: boolean }) => {
      const outcome = pendingGraveyardOutcome;
      if (!outcome) return;
      setPendingGraveyardOutcome(null);
      setGraveyardVictoryDoubleCard(null);
      finalizeBattleOutcome(outcome, {
        graveyardCard: card,
        doubleVictoryPixels: options?.doublePixels === true,
      });
    },
    [finalizeBattleOutcome, pendingGraveyardOutcome],
  );

  const handleRequestGraveyardVictoryDoubleAd = useCallback((card: Card) => {
    setGraveyardVictoryDoubleCard(card);
  }, []);

  const handleLostRouletteComplete = useCallback(
    (card: Card) => {
      const outcome = pendingLostRouletteOutcome;
      if (!outcome) return;
      setPendingLostRouletteOutcome(null);
      if (isTalismanEquipped(card)) {
        setPendingTalismanSave({ outcome, card });
        return;
      }
      finalizeBattleOutcome(outcome, { lostCard: card });
    },
    [finalizeBattleOutcome, pendingLostRouletteOutcome],
  );

  const handleTalismanSaveConfirm = useCallback(() => {
    const pending = pendingTalismanSave;
    if (!pending) return;
    setPendingTalismanSave(null);
    finalizeBattleOutcome(pending.outcome, { talismanSavedCard: pending.card });
  }, [finalizeBattleOutcome, pendingTalismanSave]);

  const handleBattleEndedChange = useCallback((ended: boolean) => {
    setBattleEndDock(ended);
  }, []);

  const handleResetBattleRecords = useCallback(() => {
    const next = resetBattleHistory({
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
    setBattleHistory([]);
  }, [
    activeDeckIndex,
    adState,
    battleHistory,
    deckNames,
    decks,
    economy,
    initialSave.schemaVersion,
    inventory,
    lastBattleDeckIndex,
    persistSave,
    talismanStarterGranted,
    unlockedDeckCount,
    user,
  ]);

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
        const rescaled = rescaleDeckBp(
          cards,
          clamped,
          paletteShopUnlocksRef.current,
        );
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

  const handleDevSetJewels = useCallback(
    (amount: number) => {
      if (!import.meta.env.DEV) return;
      const nextEconomy = setJewels(economyRef.current, amount);
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

  const unlockDeckWithJewels = useCallback(
    (slotIndex: number): string | null => {
      const userLevel = userRef.current?.level ?? 1;
      if (
        !canUnlockDeckSlotWithJewels(
          slotIndex,
          unlockedDeckCountRef.current,
          userLevel,
        )
      ) {
        return 'このデッキはまだ解放できません。';
      }

      const nextEconomy = spendJewels(
        economyRef.current,
        JEWEL_COST_DECK_UNLOCK,
      );
      if (!nextEconomy) {
        return `ジュエルが ${JEWEL_COST_DECK_UNLOCK.toLocaleString()} 不足しています。`;
      }

      const nextCount = clampUnlockedDeckCount(
        unlockedDeckCountRef.current + 1,
      );
      const nextIndex = nextCount - 1;
      setUnlockedDeckCount(nextCount);
      setActiveDeckIndex(nextIndex);
      setDetailCardId(null);
      setEconomy(nextEconomy);
      economyRef.current = nextEconomy;
      unlockedDeckCountRef.current = nextCount;
      persistSave({
        unlockedDeckCount: nextCount,
        activeDeckIndex: nextIndex,
        economy: nextEconomy,
      });
      return null;
    },
    [persistSave],
  );

  const unlockPaletteColor = useCallback(
    (
      index: number,
      method: 'pixels' | 'jewels',
    ): string | null => {
      const userLevel = userRef.current?.level ?? 1;
      const currentUnlocks = paletteShopUnlocksRef.current;
      const unlock =
        method === 'pixels'
          ? unlockPaletteWithPixels(
              index,
              userLevel,
              economyRef.current,
              currentUnlocks,
            )
          : unlockPaletteWithJewels(
              index,
              userLevel,
              economyRef.current,
              currentUnlocks,
            );
      if (!unlock) {
        return method === 'pixels'
          ? 'px が不足しています。'
          : 'ジュエルが不足しています。';
      }
      setEconomy(unlock.economy);
      setPaletteShopUnlocks(unlock.shopUnlocks);
      economyRef.current = unlock.economy;
      paletteShopUnlocksRef.current = unlock.shopUnlocks;
      persistSave({
        economy: unlock.economy,
        paletteShopUnlocks: unlock.shopUnlocks,
      });
      return null;
    },
    [persistSave],
  );

  const unlockPaletteWithPixelsHandler = useCallback(
    (index: number) => unlockPaletteColor(index, 'pixels'),
    [unlockPaletteColor],
  );

  const unlockPaletteWithJewelsHandler = useCallback(
    (index: number) => unlockPaletteColor(index, 'jewels'),
    [unlockPaletteColor],
  );

  const handleDevUnlockAllPaletteColors = useCallback((): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const nextUnlocks = createFullPaletteShopUnlocks();
    setPaletteShopUnlocks(nextUnlocks);
    paletteShopUnlocksRef.current = nextUnlocks;
    persistSave({ paletteShopUnlocks: nextUnlocks });
    return `ショップ追加分の色をすべて解放しました（${nextUnlocks.length}色）。`;
  }, [persistSave]);

  const handleDevClearPaletteShopUnlocks = useCallback((): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    setPaletteShopUnlocks([]);
    paletteShopUnlocksRef.current = [];
    persistSave({ paletteShopUnlocks: [] });
    return 'ショップ追加分の色を未解放に戻しました。';
  }, [persistSave]);

  const handleRenameDeck = useCallback(
    (deckIndex: number, name: string) => {
      if (
        isDeckNameTakenByOtherDeck(
          deckNamesRef.current,
          deckIndex,
          name,
          unlockedDeckCountRef.current,
        )
      ) {
        return;
      }
      const nextDeckNames = setDeckNameAt(deckNamesRef.current, deckIndex, name);
      setDeckNames(nextDeckNames);
      deckNamesRef.current = nextDeckNames;
      persistSave({ deckNames: nextDeckNames });
    },
    [persistSave],
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

  const showGraveyardVictoryDoubleAd = useMemo(
    () => isProfileComplete(user) && isNormalBattleAdsEnabledAtUserLevel(user.level),
    [user],
  );

  const battleEndNewBattleDisabled = useMemo(() => {
    if (pendingLostRouletteOutcome != null) return true;
    if (pendingTalismanSave != null) return true;
    if (isHistoryRematch) {
      return !hasHistoryRematchDeck(decks, unlockedDeckCount);
    }
    const deckIndex = lastBattleDeckIndex;
    return deckHasLostCard(normalizeDeckLayout(decks[deckIndex] ?? []));
  }, [decks, isHistoryRematch, lastBattleDeckIndex, pendingLostRouletteOutcome, pendingTalismanSave, unlockedDeckCount]);

  const isHistoryRematchDeckSelect =
    historyRematchFlow?.phase === 'deckSelect';

  const showProfileBar =
    isProfileComplete(user) &&
    (isTabId(screen) || isHistoryRematchDeckSelect);
  const showDock =
    isDockVisible(screen) ||
    (screen === 'battleSetup' && battleEndDock) ||
    isHistoryRematchDeckSelect;
  const activeTab: TabId = isHistoryRematchDeckSelect
    ? 'records'
    : screen === 'battleSetup' && battleEndDock
      ? isHistoryRematch
        ? 'records'
        : 'battleHub'
      : isTabId(screen)
        ? screen
        : 'deck';

  const selectTab = useCallback(
    (tab: TabId) => {
      setBattleEndDock(false);
      clearHistoryRematch();
      resetHistoryRematchFlow();
      if (tab !== 'deck') {
        setDeckReorderMode(false);
      }
      setScreen(tab);
    },
    [clearHistoryRematch, resetHistoryRematchFlow],
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
              if (options?.returnToDetail) {
                setCardEditPendingAd(card);
                return;
              }
              setEditingCard(card);
              setEditorReturnToDetail(false);
              setDetailCardId(null);
              setDeckReorderMode(false);
              setScreen('editor');
            }}
            onDeleteCard={deleteDeckCard}
            onReviveLostCard={reviveLostCard}
            onDowngradeReviveLostCard={downgradeReviveLostCard}
            inventory={inventory}
            onLimitBreakCard={limitBreakCard}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            onReorderDeck={reorderDeck}
            onMoveCardBetweenDecks={moveCardBetweenDecks}
            onUnlockDeck={unlockDeckWithJewels}
            onRenameDeck={handleRenameDeck}
            onEquipTalisman={equipTalismanOnCard}
            onUnequipTalisman={unequipTalismanOnCard}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen
            key={battleHubResetKey}
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            onStartBattle={requestGoToBattleSetup}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
          />
        )}
        {isHistoryRematchDeckSelect ? (
          <BattleDeckSelectScreen
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            deckReadinessMode="historyRematch"
            backLabel="バトル履歴に戻る"
            onStartBattle={startHistoryRematchBattle}
            onBack={resetHistoryRematchFlow}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
          />
        ) : screen === 'records' && (
          <RecordsScreen
            battleHistory={battleHistory}
            canRematch={hasHistoryRematchDeck(decks, unlockedDeckCount)}
            onRequestRematch={requestHistoryRematch}
          />
        )}
        {screen === 'shop' && (
          <ShopScreen
            userLevel={user?.level ?? 1}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            shopUnlocks={paletteShopUnlocks}
            onUnlockWithPixels={unlockPaletteWithPixelsHandler}
            onUnlockWithJewels={unlockPaletteWithJewelsHandler}
          />
        )}
        {screen === 'inventory' && (
          <InventoryScreen
            inventory={inventory}
            equippedTalismanCount={equippedTalismanCount}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            user={user}
            unlockedDeckCount={unlockedDeckCount}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
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
            onDevSetJewels={handleDevSetJewels}
            onDevSetAttributeShards={handleDevSetAttributeShards}
            onDevSetUniversalShards={handleDevSetUniversalShards}
            onDevSetTalisman={handleDevSetTalisman}
            onDevMarkCardLost={handleDevMarkCardLost}
            onDevFillDeckSlots={handleDevFillDeckSlots}
            paletteShopUnlockCount={paletteShopUnlocks.length}
            onDevUnlockAllPaletteColors={handleDevUnlockAllPaletteColors}
            onDevClearPaletteShopUnlocks={handleDevClearPaletteShopUnlocks}
          />
        )}
        {screen === 'editor' && (
          <EditorScreen
            key={editingCard?.id ?? 'new'}
            deckCount={activeDeckCardCount}
            userLevel={user?.level ?? 1}
            editTarget={editingCard}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            paletteShopUnlocks={paletteShopUnlocks}
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
            onRenameCard={renameDeckCard}
            onUnlockPaletteWithPixels={unlockPaletteWithPixelsHandler}
            onUnlockPaletteWithJewels={unlockPaletteWithJewelsHandler}
          />
        )}
        {screen === 'battleSetup' && !isHistoryRematchDeckSelect && (
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
            isHistoryRematch={isHistoryRematch}
            enableOpponentMatching={!isHistoryRematch}
            onCancelMatch={isHistoryRematch ? undefined : handleCancelBattleMatch}
            cancelMatchDisabled={economy.freePixels < BATTLE_MATCH_CANCEL_COST}
            cancelMatchCostPx={BATTLE_MATCH_CANCEL_COST}
            onFinish={handleBattleOutcome}
            onNewBattle={
              isHistoryRematch ? rematchSameOpponent : restartBattleFromEnd
            }
            newBattleDisabled={battleEndNewBattleDisabled}
            onBattleEndedChange={handleBattleEndedChange}
          />
        )}
      </main>

      {showDock && <AppDock activeTab={activeTab} onSelect={selectTab} />}

      {historyRematchFlow?.phase === 'rules' && (
        <HistoryRematchRulesModal
          onConfirm={proceedHistoryRematchAfterRules}
          onCancel={resetHistoryRematchFlow}
        />
      )}
      {historyRematchPendingAdDeckIndex != null && (
        <MockRewardAdModal
          title="再戦のための広告視聴"
          message="3回に1回、バトル開始前にリワード広告の視聴が必要です（モック）"
          onComplete={() => {
            setHistoryRematchPendingAdDeckIndex((deckIndex) => {
              if (deckIndex != null) {
                executeHistoryRematchBattle(deckIndex);
              }
              return null;
            });
          }}
          onCancel={() => setHistoryRematchPendingAdDeckIndex(null)}
        />
      )}
      {normalBattlePendingAdDeckIndex != null && (
        <MockRewardAdModal
          title="バトル開始のための広告視聴"
          message="3回に1回、バトル開始前にリワード広告の視聴が必要です（モック）"
          onComplete={() => {
            setNormalBattlePendingAdDeckIndex((deckIndex) => {
              if (deckIndex != null) {
                goToBattleSetup(deckIndex);
              }
              return null;
            });
          }}
          onCancel={() => setNormalBattlePendingAdDeckIndex(null)}
        />
      )}
      {graveyardVictoryDoubleCard != null && (
        <MockRewardAdModal
          title="報酬2倍のための広告視聴"
          message="広告視聴後、このバトルの px 報酬が2倍になります（モック）"
          onComplete={() => {
            setGraveyardVictoryDoubleCard((card) => {
              if (card) {
                handleGraveyardPick(card, { doublePixels: true });
              }
              return null;
            });
          }}
          onCancel={() => setGraveyardVictoryDoubleCard(null)}
        />
      )}
      {cardEditPendingAd != null && (
        <MockRewardAdModal
          title="編集のための広告視聴"
          message="広告視聴後、カード編集画面へ進みます（モック）"
          onComplete={() => {
            setCardEditPendingAd((card) => {
              if (card) {
                setEditingCard(card);
                setEditorReturnToDetail(true);
                setDeckReorderMode(false);
                setScreen('editor');
              }
              return null;
            });
          }}
          onCancel={() => setCardEditPendingAd(null)}
        />
      )}

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
          title={limitBreakSuccessModal.title}
          outcomeLine={limitBreakSuccessModal.outcomeLine}
          onClose={() => setLimitBreakSuccessModal(null)}
        />
      )}
      {pendingGraveyardOutcome && (
        <GraveyardPickModal
          survivorCards={pendingGraveyardOutcome.survivorPlayerCards}
          graveyardCards={resolveGraveyardLootCards(pendingGraveyardOutcome)}
          expGain={pendingBattleExpGain}
          showVictoryDoubleAd={showGraveyardVictoryDoubleAd}
          onPick={handleGraveyardPick}
          onRequestVictoryDoubleAd={handleRequestGraveyardVictoryDoubleAd}
        />
      )}
      {pendingLostRouletteOutcome && (
        <LostRouletteModal
          cards={pendingLostRouletteOutcome.defeatedPlayerCards}
          onComplete={handleLostRouletteComplete}
        />
      )}
      {pendingTalismanSave && (
        <TalismanSaveModal
          card={pendingTalismanSave.card}
          onConfirm={handleTalismanSaveConfirm}
        />
      )}
    </div>
  );
}

export default App;
