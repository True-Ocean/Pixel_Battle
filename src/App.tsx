import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AdState, Attribute, Card, MemoryAlbumState, MissionState, ScreenId, ShopPurchaseState, SubscriptionPlan, UserProfile, UserEconomy, UserInventory, UserSubscription, BattleOutcome, BattleHistoryEntry } from './types';
import { appendBattleHistory, createBattleHistoryEntry, CPU_OPPONENT_LABEL } from './battleHistory';
import { isAttributeUnlockedAtLevel } from './config/attributeUnlock';
import { DECK_SLOT_COUNT, MAX_USER_LEVEL, DECK_MAX, USER_INITIAL_LEVEL } from './config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from './config/devUserLevel';
import { updateDeckAtIndex, clampUnlockedDeckCount, moveCardBetweenDeckSlotsSwap, countDeckCards, getDeckCards, normalizeDeckLayout, isDeckBattleReady, setDeckNameAt, deckHasLostCard, getDeckDisplayName, isDeckSlotUnlocked, isDeckNameTakenByOtherDeck, resolveDeckUnlockOnLevelUp, hasHistoryRematchDeck, canUnlockDeckSlotWithJewels } from './deckSlots';
import type { DeckLayout } from './types';
import { applyCardSurvivalRecords, applyCardFullRevive, consumeTalismanFromCard, countEquippedTalismans, isCardLost, isTalismanEquipped, markCardLost, rescaleDeckBp, applyLimitBreakToCard, canLimitBreakCard, canReviveLostCard, describeLimitBreakRaritySuccessTitle, describeLimitBreakResult, getLimitBreakOutcomeKind, retouchCardAttribute, selectCardAttribute, tryEquipTalismanInDeck, tryUnequipTalismanInDeck, type LimitBreakShardSpendPlan } from './card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired, BATTLE_MATCH_CANCEL_COST } from './config/economy';
import { buildBalancedCpuDeck, buildCpuCardsForDeckFill } from './game/cpuDeck';
import { resolveGraveyardLootCards } from './battle/graveyardLoot';
import { createInitialMissionState } from './user/missionState';
import { getBattlesDayKey } from './user/adState';
import { applyMissionResets, hasMissionPeriodExpired } from './mission/reset';
import {
  applyMissionEvents,
  claimMission,
  claimMissionsInCategory,
  countUnclaimedMissions,
  formatMissionCompleteToastMessage,
  getMissionById,
  getMissionChallengeTarget,
} from './mission';
import type { MissionCategory, MissionEventType } from './mission';
import { loadSave, saveSave, SAVE_SCHEMA_VERSION } from './storage';
import { calcBattleExpGainForUser, createInitialProfile, createInitialEconomy, createInitialInventory, createInitialAdState, isProfileComplete, recordUserBattleOutcome, grantBattleExp, applyLevelUpEconomyRewards, applyLevelUpInventoryRewards, totalExpForLevel, addFreePixels, spendFreePixels, setFreePixels, setJewels, addLimitBreakShards, addInventoryCount, spendLimitBreakResources, spendJewels, getUniformAttributeShardsCount, setAllAttributeLimitBreakShards, setTalismanCount, setUniversalLimitBreakShards, isNormalBattleAdsEnabledAtUserLevel, shouldRequireBattleStartAd, shouldShowHistoryRematchRulesModal, dismissHistoryRematchRulesForToday, shouldShowLostCardDeckNoticeModal, dismissLostCardDeckNoticeForToday, addCardToMemoryAlbum, createInitialMemoryAlbum, memoryAlbumHasSpace, removeCardFromMemoryAlbumById, setMemoryAlbumUnlockedRows, unlockMemoryAlbumRow, devSetSubscriptionPlan, formatSubscriptionPlanLabel, canEditCardUserNote, hasPremiumAlwaysDouble, skipsBattleStartAd, skipsCreativeAd } from './user';
import { prepareHistoryOpponentDeck } from './historyRematch';
import {
  unlockPaletteWithJewels,
  createFullPaletteShopUnlocks,
} from './user/paletteShop';
import {
  normalizeEditorShopUnlocks,
  unlockEditorFeatureWithJewels,
} from './user/editorShop';
import {
  EDITOR_SHOP_UNLOCK_IDS,
  type EditorShopUnlockId,
} from './config/editorShop';
import { normalizePaletteShopUnlocks } from './config/paletteUnlock';
import { crossedTalismanStarterLevel, isLossEnabledAtUserLevel, shouldGrantTalismanStarterOnDevSetLevel, tryGrantTalismanStarter } from './user/talismanStarter';
import type { JewelPackId, ShopTabId, UniversalShardPackId } from './config/shop';
import {
  createInitialShopPurchaseState,
  createInitialSubscription,
  mockPurchaseJewelPack,
  mockPurchaseTalisman,
  mockPurchaseUniversalShardPack,
  mockSubscribe,
  normalizeShopPurchaseState,
  normalizeUserSubscription,
} from './user/shop';
import {
  calcFullReviveCost,
  calcGraveyardShardReward,
  calcLostCardDeleteRewards,
  calcSurvivorPixels,
  calcVictoryBattlePixels,
  countBattleSurvivors,
  canUnlockMoreMemoryAlbumRows,
  type CardDeleteOutcome,
  JEWEL_COST_DELETE,
  JEWEL_COST_MEMORY_ALBUM_ROW,
  JEWEL_COST_ATTRIBUTE_SELECT,
  JEWEL_COST_DECK_UNLOCK,
  MEMORY_ALBUM_INITIAL_ROWS,
  PIXEL_COST_ATTRIBUTE_RETOUCH,
  getCardRenameCount,
  getEditorSaveTotalPixelCost,
  type EditorSaveCharges,
} from './config/economy';
import { CardDeleteResultModal } from './components/CardDeleteResultModal';
import { LevelUpModal } from './components/LevelUpModal';
import { LimitBreakSuccessModal } from './components/LimitBreakSuccessModal';
import { GraveyardPickModal } from './components/GraveyardPickModal';
import {
  HelpInlinePxIcon,
  InlinePxCost,
  inlinePxShortageError,
} from './components/HelpInlineEconomy';
import { LostRouletteModal } from './components/LostRouletteModal';
import { TalismanSaveModal } from './components/TalismanSaveModal';
import { AppTitle } from './components/AppTitle';
import { AppDock } from './components/AppDock';
import { DeckScreen } from './components/DeckScreen';
import { MemoryAlbumScreen } from './components/MemoryAlbumScreen';
import { MissionScreen } from './components/MissionScreen';
import { MissionCompleteToast } from './components/MissionCompleteToast';
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
import { DeckIntroModal } from './components/DeckIntroModal';
import { UserProfileBar } from './components/UserProfileBar';
import { isDockVisible, isTabId, type TabId } from './navigation/screenIds';
import { normalizeSoundEnabled } from './user/preferences';
import { bgmPlayer } from './audio/bgmPlayer';
import { useBgm } from './audio/useBgm';
import './App.css';

function initialScreen(user: UserProfile | null): ScreenId {
  return isProfileComplete(user) ? 'deck' : 'setup';
}

function App() {
  const initialSave = loadSave();
  const [screen, setScreen] = useState<ScreenId>('title');
  const [enterFromTitle, setEnterFromTitle] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() =>
    normalizeSoundEnabled(initialSave.soundEnabled),
  );
  useBgm(screen, soundEnabled);
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
  const [editorShopUnlocks, setEditorShopUnlocks] = useState<
    EditorShopUnlockId[]
  >(() => normalizeEditorShopUnlocks(initialSave.editorShopUnlocks));
  const [memoryAlbum, setMemoryAlbum] = useState<MemoryAlbumState>(
    () => initialSave.memoryAlbum ?? createInitialMemoryAlbum(),
  );
  const [shopPurchase, setShopPurchase] = useState<ShopPurchaseState>(() =>
    normalizeShopPurchaseState(initialSave.shopPurchase),
  );
  const [subscription, setSubscription] = useState<UserSubscription>(() =>
    normalizeUserSubscription(initialSave.subscription),
  );
  const [missionState, setMissionState] = useState<MissionState>(() =>
    applyMissionResets(initialSave.missionState ?? createInitialMissionState()),
  );
  const [shopPurchaseMessage, setShopPurchaseMessage] = useState<ReactNode | null>(
    null,
  );
  const [shopInitialTab, setShopInitialTab] = useState<ShopTabId>('jewels');
  const [missionCompleteToast, setMissionCompleteToast] = useState<string | null>(
    null,
  );
  const [deckIntroSeen, setDeckIntroSeen] = useState(
    () => initialSave.deckIntroSeen === true,
  );
  const [deckIntroOpen, setDeckIntroOpen] = useState(false);

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
  const [battleStartPendingAd, setBattleStartPendingAd] = useState<{
    kind: 'normal' | 'historyRematch';
    deckIndex: number;
  } | null>(null);
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
  const [deleteResult, setDeleteResult] = useState<CardDeleteOutcome | null>(null);

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
  const editorShopUnlocksRef = useRef(editorShopUnlocks);
  const memoryAlbumRef = useRef(memoryAlbum);
  const shopPurchaseRef = useRef(shopPurchase);
  const subscriptionRef = useRef(subscription);
  const missionStateRef = useRef(missionState);
  const screenRef = useRef(screen);
  const isHistoryRematchRef = useRef(false);
  const historyRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
  const battleStartSnapshotRef = useRef<{
    deckIndex: number;
    playerDeck: Card[];
    playerLevel: number;
  } | null>(null);
  const settingsReturnScreenRef = useRef<ScreenId>('deck');
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
  editorShopUnlocksRef.current = editorShopUnlocks;
  memoryAlbumRef.current = memoryAlbum;
  shopPurchaseRef.current = shopPurchase;
  subscriptionRef.current = subscription;
  missionStateRef.current = missionState;
  screenRef.current = screen;

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
      editorShopUnlocks?: EditorShopUnlockId[];
      memoryAlbum?: MemoryAlbumState;
      shopPurchase?: ShopPurchaseState;
      subscription?: UserSubscription;
      missionState?: MissionState;
      devPreferSavedLevel?: boolean;
      devFileOverrideLevel?: number | null;
      soundEnabled?: boolean;
      deckIntroSeen?: boolean;
    }) => {
      if (next.devPreferSavedLevel !== undefined) {
        devPreferSavedLevelRef.current = next.devPreferSavedLevel;
      }
      if (next.devFileOverrideLevel !== undefined) {
        devFileOverrideLevelRef.current = next.devFileOverrideLevel;
      }
      const rawMissionState = next.missionState ?? missionStateRef.current;
      const missionStateToSave = hasMissionPeriodExpired(rawMissionState)
        ? applyMissionResets(rawMissionState)
        : rawMissionState;
      if (hasMissionPeriodExpired(missionStateRef.current)) {
        missionStateRef.current = missionStateToSave;
        setMissionState(missionStateToSave);
      }
      saveSave({
        schemaVersion: SAVE_SCHEMA_VERSION,
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
        editorShopUnlocks:
          next.editorShopUnlocks ?? editorShopUnlocksRef.current,
        memoryAlbum: next.memoryAlbum ?? memoryAlbumRef.current,
        shopPurchase: next.shopPurchase ?? shopPurchaseRef.current,
        subscription: next.subscription ?? subscriptionRef.current,
        missionState: missionStateToSave,
        soundEnabled: next.soundEnabled ?? soundEnabled,
        deckIntroSeen: next.deckIntroSeen ?? deckIntroSeen,
        ...(devPreferSavedLevelRef.current
          ? {
              devPreferSavedLevel: true as const,
              devFileOverrideLevel:
                devFileOverrideLevelRef.current ?? DEV_USER_LEVEL_OVERRIDE ?? null,
            }
          : {}),
      });
    },
    [activeDeckIndex, adState, deckIntroSeen, decks, economy, inventory, lastBattleDeckIndex, missionState, paletteShopUnlocks, shopPurchase, soundEnabled, subscription, talismanStarterGranted, unlockedDeckCount, user],
  );

  const reportAndPersistMissionEvents = useCallback(
    (
      events: ReadonlyArray<{ type: MissionEventType; amount?: number }>,
      savePatch?: Omit<Parameters<typeof persistSave>[0], 'missionState'>,
    ) => {
      const prev = missionStateRef.current;
      const result = applyMissionEvents(prev, events);
      const missionChanged = result.state !== prev;
      if (missionChanged) {
        missionStateRef.current = result.state;
        setMissionState(result.state);
      }
      if (savePatch || missionChanged) {
        persistSave({
          ...savePatch,
          ...(missionChanged ? { missionState: result.state } : {}),
        });
      }
      const toastMessage = formatMissionCompleteToastMessage(result.newlyCompleted);
      if (toastMessage) {
        setMissionCompleteToast(toastMessage);
      }
      return result;
    },
    [persistSave],
  );

  useEffect(() => {
    if (!missionCompleteToast) return;
    const timerId = window.setTimeout(() => {
      setMissionCompleteToast(null);
    }, 4000);
    return () => window.clearTimeout(timerId);
  }, [missionCompleteToast]);

  const dismissDeckIntro = useCallback(() => {
    setDeckIntroOpen(false);
    setDeckIntroSeen(true);
    persistSave({ deckIntroSeen: true });
  }, [persistSave]);

  useEffect(() => {
    if (!user || deckIntroSeen || screen !== 'deck') return;
    if (activeDeckCardCount >= DECK_MAX) {
      setDeckIntroSeen(true);
      persistSave({ deckIntroSeen: true });
      return;
    }
    setDeckIntroOpen(true);
  }, [user, deckIntroSeen, screen, activeDeckCardCount, persistSave]);

  const appOpenReportedDayKeyRef = useRef<string | null>(null);

  const refreshMissionsForCurrentDate = useCallback(() => {
    const prev = missionStateRef.current;
    const todayKey = getBattlesDayKey();
    const periodExpired = hasMissionPeriodExpired(prev);
    const user = userRef.current;
    const currentScreen = screenRef.current;
    const canTrackAppOpen =
      isProfileComplete(user) &&
      currentScreen !== 'title' &&
      currentScreen !== 'setup';
    const appOpenNeeded =
      canTrackAppOpen && appOpenReportedDayKeyRef.current !== todayKey;

    if (!periodExpired && !appOpenNeeded) return;

    if (appOpenNeeded) {
      appOpenReportedDayKeyRef.current = todayKey;
      reportAndPersistMissionEvents([{ type: 'app_open' }]);
      return;
    }

    const next = applyMissionResets(prev);
    missionStateRef.current = next;
    setMissionState(next);
    persistSave({ missionState: next });
  }, [persistSave, reportAndPersistMissionEvents]);

  useEffect(() => {
    refreshMissionsForCurrentDate();
  }, [refreshMissionsForCurrentDate, screen, user]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshMissionsForCurrentDate();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refreshMissionsForCurrentDate]);

  const applyShopPurchaseResult = useCallback(
    (result: {
      economy: UserEconomy;
      inventory: UserInventory;
      shopPurchase: ShopPurchaseState;
      subscription: UserSubscription;
      message: string;
      messagePixelCost?: number;
    }) => {
      setEconomy(result.economy);
      setInventory(result.inventory);
      setShopPurchase(result.shopPurchase);
      setSubscription(result.subscription);
      setShopPurchaseMessage(
        result.messagePixelCost != null ? (
          <>
            {result.message}（
            <InlinePxCost amount={result.messagePixelCost} />
            ）
          </>
        ) : (
          result.message
        ),
      );
      persistSave({
        economy: result.economy,
        inventory: result.inventory,
        shopPurchase: result.shopPurchase,
        subscription: result.subscription,
      });
    },
    [persistSave],
  );

  const handlePurchaseJewelPack = useCallback(
    (packId: JewelPackId) => {
      applyShopPurchaseResult(
        mockPurchaseJewelPack(
          economyRef.current,
          inventoryRef.current,
          shopPurchaseRef.current,
          subscriptionRef.current,
          packId,
        ),
      );
    },
    [applyShopPurchaseResult],
  );

  const handlePurchaseTalisman = useCallback(() => {
    const result = mockPurchaseTalisman(
      economyRef.current,
      inventoryRef.current,
      shopPurchaseRef.current,
      subscriptionRef.current,
    );
    if (result) applyShopPurchaseResult(result);
    else setShopPurchaseMessage(<><HelpInlinePxIcon />が足りません。</>);
  }, [applyShopPurchaseResult]);

  const handlePurchaseUniversalShard = useCallback(
    (packId: UniversalShardPackId) => {
      const result = mockPurchaseUniversalShardPack(
        economyRef.current,
        inventoryRef.current,
        shopPurchaseRef.current,
        subscriptionRef.current,
        packId,
      );
      if (result) applyShopPurchaseResult(result);
      else setShopPurchaseMessage(<>購入できません（<HelpInlinePxIcon />不足または本日の上限）。</>);
    },
    [applyShopPurchaseResult],
  );

  const handleSubscribe = useCallback(
    (plan: 'light' | 'premium') => {
      const outcome = mockSubscribe(
        economyRef.current,
        inventoryRef.current,
        shopPurchaseRef.current,
        subscriptionRef.current,
        plan,
      );
      if (outcome.ok) {
        applyShopPurchaseResult(outcome.result);
      } else {
        setShopPurchaseMessage(outcome.message);
      }
    },
    [applyShopPurchaseResult],
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
    setBattleStartPendingAd((pending) =>
      pending?.kind === 'historyRematch' ? null : pending,
    );
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
          battleStarts: (adStateRef.current.battleStarts ?? 0) + 1,
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
        !skipsBattleStartAd(subscriptionRef.current) &&
        shouldRequireBattleStartAd(adStateRef.current.battleStarts ?? 0)
      ) {
        setBattleStartPendingAd({ kind: 'normal', deckIndex });
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

  const handleCancelHistoryRematch = useCallback(() => {
    setBattleEndDock(false);
    clearHistoryRematch();
    resetHistoryRematchFlow();
    setBattleSetupKey((key) => key + 1);
    setScreen('records');
  }, [clearHistoryRematch, resetHistoryRematchFlow]);

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

  const handleDismissLostCardDeckNoticeForToday = useCallback(() => {
    const nextAdState = dismissLostCardDeckNoticeForToday(adStateRef.current);
    adStateRef.current = nextAdState;
    setAdState(nextAdState);
    persistSave({ adState: nextAdState });
  }, [persistSave]);

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
        battleStarts: (adStateRef.current.battleStarts ?? 0) + 1,
      };
      adStateRef.current = nextAdState;
      setAdState(nextAdState);
      persistSave({ adState: nextAdState });

      setBattleStartPendingAd(null);
      resetHistoryRematchFlow();
      setBattleSetupKey((k) => k + 1);
      setBattleEndDock(false);
      setScreen('battleSetup');
    },
    [historyRematchFlow, persistSave, resetHistoryRematchFlow],
  );

  const startHistoryRematchBattle = useCallback(
    (deckIndex: number) => {
      const starts = adStateRef.current.battleStarts ?? 0;
      if (
        !skipsBattleStartAd(subscriptionRef.current) &&
        shouldRequireBattleStartAd(starts)
      ) {
        setBattleStartPendingAd({ kind: 'historyRematch', deckIndex });
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
      let added = false;
      updateActiveDeck((prev) => {
        const next = normalizeDeckLayout(prev);
        const emptyIndex = next.findIndex((slot) => slot == null);
        if (emptyIndex < 0) return next;
        next[emptyIndex] = card;
        added = true;
        return next;
      });
      if (added) {
        reportAndPersistMissionEvents([{ type: 'card_created' }]);
      }
    },
    [reportAndPersistMissionEvents, updateActiveDeck],
  );

  const updateCard = useCallback(
    (
      updated: Card,
      options?: {
        saveCharges?: EditorSaveCharges;
        nameChanged?: boolean;
      },
    ) => {
      const charges = options?.saveCharges;
      let nextEconomy = economyRef.current;
      let economyChanged = false;

      if (charges) {
        const totalPx = getEditorSaveTotalPixelCost(charges);
        if (totalPx > 0) {
          const spent = spendFreePixels(nextEconomy, totalPx);
          if (!spent) return;
          nextEconomy = spent;
          economyChanged = true;
        }
      }

      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const original = prevLayout.find((card) => card?.id === updated.id);
      let finalCard = updated;
      if (options?.nameChanged && original) {
        finalCard = {
          ...updated,
          renameCount: getCardRenameCount(original) + 1,
        };
      }

      const nextLayout = prevLayout.map((card) =>
        card?.id === finalCard.id ? finalCard : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
      setDecks(nextDecks);
      decksRef.current = nextDecks;
      setEditingCard(finalCard);

      if (economyChanged) {
        setEconomy(nextEconomy);
        economyRef.current = nextEconomy;
        persistSave({ decks: nextDecks, economy: nextEconomy });
      } else {
        persistSave({ decks: nextDecks });
      }
      reportAndPersistMissionEvents([{ type: 'card_edit_saved' }]);
    },
    [persistSave, reportAndPersistMissionEvents],
  );

  const pendingRetouchCardRef = useRef<Card | null>(null);

  const retouchCardAttributeInDeck = useCallback(
    (
      cardId: string,
    ):
      | {
          attribute: Attribute;
          previousAttribute: Attribute;
          previousBp: number;
          newBp: number;
          previousFreePixels: number;
          nextFreePixels: number;
        }
      | { error: ReactNode } => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === cardId);
      if (!target || isCardLost(target)) {
        return { error: 'カードが見つかりません。' };
      }

      const previousFreePixels = economyRef.current.freePixels;
      const spent = spendFreePixels(
        economyRef.current,
        PIXEL_COST_ATTRIBUTE_RETOUCH,
      );
      if (!spent) {
        return {
          error: inlinePxShortageError(PIXEL_COST_ATTRIBUTE_RETOUCH),
        };
      }

      const userLevel = userRef.current?.level ?? 1;
      const previousAttribute = target.attribute;
      const previousBp = target.bp;
      const updated = retouchCardAttribute(
        target,
        userLevel,
        paletteShopUnlocksRef.current,
      );
      pendingRetouchCardRef.current = updated;

      setEconomy(spent);
      economyRef.current = spent;
      persistSave({ economy: spent });

      return {
        attribute: updated.attribute,
        previousAttribute,
        previousBp,
        newBp: updated.bp,
        previousFreePixels,
        nextFreePixels: spent.freePixels,
      };
    },
    [persistSave],
  );

  const commitRetouchCardAttributeInDeck = useCallback(() => {
    const updated = pendingRetouchCardRef.current;
    if (!updated) return;

    pendingRetouchCardRef.current = null;
    const deckIndex = activeDeckIndexRef.current;
    const prevDecks = decksRef.current;
    const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
    const nextLayout = prevLayout.map((card) =>
      card?.id === updated.id ? updated : card,
    );
    const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
    setDecks(nextDecks);
    decksRef.current = nextDecks;
    persistSave({ decks: nextDecks });
    reportAndPersistMissionEvents([{ type: 'attribute_retouch' }]);
  }, [persistSave, reportAndPersistMissionEvents]);

  const selectCardAttributeInDeck = useCallback(
    (
      cardId: string,
      attribute: Attribute,
    ):
      | { previousJewels: number; nextJewels: number; attribute: Attribute; previousBp: number; newBp: number }
      | string => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === cardId);
      if (!target || isCardLost(target)) {
        return 'カードが見つかりません。';
      }

      const userLevel = userRef.current?.level ?? 1;
      if (!isAttributeUnlockedAtLevel(attribute, userLevel)) {
        return '未解放の属性です。';
      }

      const previousJewels = economyRef.current.jewels;
      const previousBp = target.bp;
      const spent = spendJewels(economyRef.current, JEWEL_COST_ATTRIBUTE_SELECT);
      if (!spent) {
        return `ジュエルが ${JEWEL_COST_ATTRIBUTE_SELECT} 不足しています。`;
      }

      const updated = selectCardAttribute(
        target,
        attribute,
        userLevel,
        paletteShopUnlocksRef.current,
      );
      const nextLayout = prevLayout.map((card) =>
        card?.id === cardId ? updated : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);
      setDecks(nextDecks);
      decksRef.current = nextDecks;
      setEconomy(spent);
      economyRef.current = spent;
      persistSave({ decks: nextDecks, economy: spent });
      return {
        attribute,
        previousBp,
        newBp: updated.bp,
        previousJewels,
        nextJewels: spent.jewels,
      };
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

  const computeCardDeleteOutcome = useCallback(
    (
      target: Card,
      prevEconomy: UserEconomy,
      prevInventory: UserInventory,
    ): {
      economyAfter: UserEconomy;
      inventoryAfter: UserInventory;
      outcome: CardDeleteOutcome;
    } | null => {
      const previousAttributeShards =
        prevInventory.limitBreakShards[target.attribute] ?? 0;
      const nextEconomy = spendJewels(prevEconomy, JEWEL_COST_DELETE);
      if (!nextEconomy) return null;

      const { pixels, shards } = calcLostCardDeleteRewards(target);
      const economyAfter = addFreePixels(nextEconomy, pixels);
      let inventoryAfter = prevInventory;
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

      return {
        economyAfter,
        inventoryAfter,
        outcome: {
          cardName: target.name,
          attribute: target.attribute,
          previousFreePixels: prevEconomy.freePixels,
          nextFreePixels: economyAfter.freePixels,
          previousJewels: prevEconomy.jewels,
          nextJewels: economyAfter.jewels,
          previousAttributeShards,
          nextAttributeShards:
            inventoryAfter.limitBreakShards[target.attribute] ??
            previousAttributeShards,
        },
      };
    },
    [],
  );

  const deleteDeckCard = useCallback(
    (id: string): CardDeleteOutcome | null => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target) return null;

      const deleted = computeCardDeleteOutcome(
        target,
        economyRef.current,
        inventoryRef.current,
      );
      if (!deleted) return null;

      const nextDecks = removeCardFromDeck(id);
      persistSave({
        decks: nextDecks,
        economy: deleted.economyAfter,
        inventory: deleted.inventoryAfter,
      });
      setEconomy(deleted.economyAfter);
      setInventory(deleted.inventoryAfter);
      economyRef.current = deleted.economyAfter;
      inventoryRef.current = deleted.inventoryAfter;

      return deleted.outcome;
    },
    [computeCardDeleteOutcome, persistSave, removeCardFromDeck],
  );

  const addCardToMemoryAlbumFromDeck = useCallback(
    (id: string): 'ok' | 'full' | null => {
      const deckIndex = activeDeckIndexRef.current;
      const prevDecks = decksRef.current;
      const prevLayout = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const target = prevLayout.find((card) => card?.id === id);
      if (!target) return null;

      const prevAlbum = memoryAlbumRef.current;
      if (!memoryAlbumHasSpace(prevAlbum)) return 'full';

      const nextAlbum = addCardToMemoryAlbum(prevAlbum, target);
      if (!nextAlbum) return 'full';

      const nextDecks = removeCardFromDeck(id);
      persistSave({ decks: nextDecks, memoryAlbum: nextAlbum });
      setMemoryAlbum(nextAlbum);
      memoryAlbumRef.current = nextAlbum;

      return 'ok';
    },
    [persistSave, removeCardFromDeck],
  );

  const unlockMemoryAlbumRowWithJewels = useCallback((): string | null => {
    if (!canUnlockMoreMemoryAlbumRows(memoryAlbumRef.current.unlockedRows)) {
      return 'アルバムはこれ以上拡張できません。';
    }

    const nextEconomy = spendJewels(
      economyRef.current,
      JEWEL_COST_MEMORY_ALBUM_ROW,
    );
    if (!nextEconomy) {
      return `ジュエルが ${JEWEL_COST_MEMORY_ALBUM_ROW.toLocaleString()} 不足しています。`;
    }

    const nextAlbum = unlockMemoryAlbumRow(memoryAlbumRef.current);
    persistSave({ economy: nextEconomy, memoryAlbum: nextAlbum });
    setEconomy(nextEconomy);
    setMemoryAlbum(nextAlbum);
    economyRef.current = nextEconomy;
    memoryAlbumRef.current = nextAlbum;
    return null;
  }, [persistSave]);

  const handleDevSetMemoryAlbumExpansionRows = useCallback(
    (expansionRows: number) => {
      if (!import.meta.env.DEV) return;
      const nextAlbum = setMemoryAlbumUnlockedRows(
        memoryAlbumRef.current,
        expansionRows + MEMORY_ALBUM_INITIAL_ROWS,
      );
      persistSave({ memoryAlbum: nextAlbum });
      setMemoryAlbum(nextAlbum);
      memoryAlbumRef.current = nextAlbum;
    },
    [persistSave],
  );

  const deleteCardFromMemoryAlbum = useCallback(
    (id: string): CardDeleteOutcome | null => {
      const prevAlbum = memoryAlbumRef.current;
      const { album: nextAlbum, card: target } = removeCardFromMemoryAlbumById(
        prevAlbum,
        id,
      );
      if (!target) return null;

      const deleted = computeCardDeleteOutcome(
        target,
        economyRef.current,
        inventoryRef.current,
      );
      if (!deleted) return null;

      persistSave({
        memoryAlbum: nextAlbum,
        economy: deleted.economyAfter,
        inventory: deleted.inventoryAfter,
      });
      setMemoryAlbum(nextAlbum);
      setEconomy(deleted.economyAfter);
      setInventory(deleted.inventoryAfter);
      memoryAlbumRef.current = nextAlbum;
      economyRef.current = deleted.economyAfter;
      inventoryRef.current = deleted.inventoryAfter;

      return deleted.outcome;
    },
    [computeCardDeleteOutcome, persistSave],
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
      if (!target || !isCardLost(target) || !canReviveLostCard(target)) return;

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
      reportAndPersistMissionEvents([{ type: 'limit_break' }]);
    },
    [persistSave, reportAndPersistMissionEvents],
  );

  const reorderDeck = useCallback(
    (ordered: DeckLayout) => {
      const deckIndex = activeDeckIndexRef.current;
      const prevLayout = normalizeDeckLayout(decksRef.current[deckIndex] ?? []);
      const prevIds = prevLayout.map((card) => card?.id ?? null);
      const nextIds = ordered.map((card) => card?.id ?? null);
      const changed = prevIds.some((id, index) => id !== nextIds[index]);

      setDecks((prevDecks) => {
        const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, ordered);
        persistSave({ decks: nextDecks });
        return nextDecks;
      });

      if (changed) {
        reportAndPersistMissionEvents([{ type: 'deck_reordered' }]);
      }
    },
    [persistSave, reportAndPersistMissionEvents],
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
        doubleVictoryRewards?: boolean;
      } = {},
    ) => {
      if (isHistoryRematchRef.current) {
        return;
      }
      const {
        graveyardCard = null,
        lostCard = null,
        talismanSavedCard = null,
        doubleVictoryRewards = false,
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
        let levelUpPixelsGranted = battleRecord.pixelsGranted;
        let levelUpJewelsGranted = battleRecord.jewelsGranted;
        let allLevelsGained = battleRecord.levelsGained;

        if (doubleVictoryRewards && outcome.winner === 'player') {
          const levelBeforeDouble = nextUser.level;
          nextUser = grantBattleExp(nextUser, expInput);
          const doubleLevelsGained: number[] = [];
          for (let level = levelBeforeDouble + 1; level <= nextUser.level; level++) {
            doubleLevelsGained.push(level);
          }
          if (doubleLevelsGained.length > 0) {
            const extraEconomy = applyLevelUpEconomyRewards(
              nextEconomy,
              doubleLevelsGained,
            );
            nextEconomy = extraEconomy.economy;
            levelUpPixelsGranted += extraEconomy.pixelsGranted;
            levelUpJewelsGranted += extraEconomy.jewelsGranted;
            const extraInventory = applyLevelUpInventoryRewards(
              nextInventory,
              doubleLevelsGained,
            );
            nextInventory = extraInventory.inventory;
            allLevelsGained = [...allLevelsGained, ...doubleLevelsGained];
          }
        }

        if (crossedTalismanStarterLevel(prevUser.level, nextUser.level)) {
          const grant = tryGrantTalismanStarter(
            nextInventory,
            nextTalismanStarterGranted,
          );
          nextInventory = grant.inventory;
          nextTalismanStarterGranted = grant.talismanStarterGranted;
        }
        if (allLevelsGained.length > 0) {
          nextUnlockedDeckCount = resolveDeckUnlockOnLevelUp(
            nextUnlockedDeckCount,
            allLevelsGained,
          );
          setLevelUpModal({
            fromLevel: prevUser.level,
            toLevel: nextUser.level,
            pixelsGranted: levelUpPixelsGranted,
            jewelsGranted: levelUpJewelsGranted,
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
          const pixelsToGrant = doubleVictoryRewards ? pixelTotal * 2 : pixelTotal;
          nextEconomy = addFreePixels(nextEconomy, pixelsToGrant);
        }
        if (graveyardCard) {
          const shardAmount = calcGraveyardShardReward(graveyardCard);
          const shardsToGrant = doubleVictoryRewards ? shardAmount * 2 : shardAmount;
          if (shardsToGrant > 0) {
            nextInventory = addLimitBreakShards(
              nextInventory,
              graveyardCard.attribute,
              shardsToGrant,
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
            { previousLevel: prevUser?.level ?? USER_INITIAL_LEVEL },
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
      const battleMissionEvents: Array<{ type: MissionEventType; amount?: number }> =
        [{ type: 'battle_play' }];
      if (outcome.winner === 'player') {
        battleMissionEvents.push({ type: 'battle_win' }, { type: 'cpu_battle_win' });
      }
      const missionResult = applyMissionEvents(
        missionStateRef.current,
        battleMissionEvents,
      );
      const nextMissionState = missionResult.state;
      if (nextMissionState !== missionStateRef.current) {
        missionStateRef.current = nextMissionState;
        setMissionState(nextMissionState);
      }
      const toastMessage = formatMissionCompleteToastMessage(
        missionResult.newlyCompleted,
      );
      if (toastMessage) {
        setMissionCompleteToast(toastMessage);
      }
      persistSave({
        user: nextUser,
        economy: nextEconomy,
        inventory: nextInventory,
        talismanStarterGranted: nextTalismanStarterGranted,
        decks: nextDecks,
        activeDeckIndex: deckIndex,
        lastBattleDeckIndex: lastBattleIndex,
        unlockedDeckCount: nextUnlockedDeckCount,
        battleHistory: nextHistory,
        missionState: nextMissionState,
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
    [persistSave],
  );

  const finalizeHistoryRematchOutcome = useCallback(
    (outcome: BattleOutcome) => {
      const battleMissionEvents: Array<{ type: MissionEventType; amount?: number }> =
        [{ type: 'battle_play' }, { type: 'history_rematch_play' }];
      if (outcome.winner === 'player') {
        battleMissionEvents.push(
          { type: 'battle_win' },
          { type: 'history_rematch_win' },
        );
      }

      let nextEconomy = economyRef.current;
      if (outcome.winner === 'player') {
        const pixelTotal = calcSurvivorPixels(
          countBattleSurvivors(
            outcome.playerCardIds,
            outcome.defeatedPlayerCardIds,
          ),
        );
        if (pixelTotal > 0) {
          nextEconomy = addFreePixels(economyRef.current, pixelTotal);
          economyRef.current = nextEconomy;
          setEconomy(nextEconomy);
        }
      }

      reportAndPersistMissionEvents(battleMissionEvents, {
        economy: nextEconomy,
        adState: adStateRef.current,
      });
    },
    [reportAndPersistMissionEvents],
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
    (card: Card, options?: { doubleRewards?: boolean }) => {
      const outcome = pendingGraveyardOutcome;
      if (!outcome) return;
      setPendingGraveyardOutcome(null);
      setGraveyardVictoryDoubleCard(null);
      const doubleVictoryRewards =
        options?.doubleRewards === true ||
        hasPremiumAlwaysDouble(subscriptionRef.current);
      finalizeBattleOutcome(outcome, {
        graveyardCard: card,
        doubleVictoryRewards,
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

  const handleSoundEnabledChange = useCallback((enabled: boolean) => {
    // モバイルはユーザー操作の同期コンテキスト内で play() する必要がある
    if (enabled) {
      bgmPlayer.unlock();
    }
    bgmPlayer.setEnabled(enabled);
    setSoundEnabled(enabled);
    persistSave({ soundEnabled: enabled });
  }, [persistSave]);

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
          { previousLevel: currentUser.level },
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

  const handleDevSetSubscription = useCallback(
    (plan: SubscriptionPlan): string => {
      if (!import.meta.env.DEV) {
        return '開発ビルドでのみ利用できます。';
      }
      const nextSubscription = devSetSubscriptionPlan(plan);
      setSubscription(nextSubscription);
      subscriptionRef.current = nextSubscription;
      persistSave({ subscription: nextSubscription });
      return `サブスクを ${formatSubscriptionPlanLabel(nextSubscription)} に変更しました。`;
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

  const unlockPaletteWithJewelsHandler = useCallback(
    (index: number): string | null => {
      const userLevel = userRef.current?.level ?? 1;
      const unlock = unlockPaletteWithJewels(
        index,
        userLevel,
        economyRef.current,
        paletteShopUnlocksRef.current,
      );
      if (!unlock) {
        return 'ジュエルが不足しています。';
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

  const unlockEditorFeatureWithJewelsHandler = useCallback(
    (feature: EditorShopUnlockId): string | null => {
      const userLevel = userRef.current?.level ?? 1;
      const unlock = unlockEditorFeatureWithJewels(
        feature,
        userLevel,
        economyRef.current,
        editorShopUnlocksRef.current,
      );
      if (!unlock) {
        return 'ジュエルが不足しています。';
      }
      setEconomy(unlock.economy);
      setEditorShopUnlocks(unlock.shopUnlocks);
      economyRef.current = unlock.economy;
      editorShopUnlocksRef.current = unlock.shopUnlocks;
      persistSave({
        economy: unlock.economy,
        editorShopUnlocks: unlock.shopUnlocks,
      });
      return null;
    },
    [persistSave],
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

  const handleDevUnlockAllEditorTools = useCallback((): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    const nextUnlocks = [...EDITOR_SHOP_UNLOCK_IDS];
    setEditorShopUnlocks(nextUnlocks);
    editorShopUnlocksRef.current = nextUnlocks;
    persistSave({ editorShopUnlocks: nextUnlocks });
    return `お絵描きツールをすべて解放しました（${nextUnlocks.length}種）。`;
  }, [persistSave]);

  const handleDevClearEditorShopUnlocks = useCallback((): string => {
    if (!import.meta.env.DEV) {
      return '開発ビルドでのみ利用できます。';
    }
    setEditorShopUnlocks([]);
    editorShopUnlocksRef.current = [];
    persistSave({ editorShopUnlocks: [] });
    return 'お絵描きツールを未解放に戻しました。';
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
    () =>
      isProfileComplete(user) &&
      isNormalBattleAdsEnabledAtUserLevel(user.level) &&
      !hasPremiumAlwaysDouble(subscription),
    [subscription, user],
  );

  const graveyardAlwaysDoubleRewards = useMemo(
    () => hasPremiumAlwaysDouble(subscription),
    [subscription],
  );

  const subscriptionPlanLabel = useMemo(
    () => formatSubscriptionPlanLabel(subscription),
    [subscription],
  );

  const editorCanEditCardUserNote = useMemo(
    () => canEditCardUserNote(subscription),
    [subscription],
  );

  const openShopSubscriptionTab = useCallback(() => {
    setShopInitialTab('subscription');
    setScreen('shop');
  }, []);

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
    (isTabId(screen) ||
      screen === 'memoryAlbum' ||
      screen === 'records' ||
      isHistoryRematchDeckSelect);
  const showDock =
    isDockVisible(screen) ||
    (screen === 'battleSetup' && battleEndDock) ||
    isHistoryRematchDeckSelect;
  const activeTab: TabId = isHistoryRematchDeckSelect
    ? 'battleHub'
    : screen === 'battleSetup' && battleEndDock
      ? 'battleHub'
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
      if (tab === 'shop') {
        setShopInitialTab('jewels');
      }
      setScreen(tab);
    },
    [clearHistoryRematch, resetHistoryRematchFlow],
  );

  const handleBattleLogViewed = useCallback(() => {
    reportAndPersistMissionEvents([{ type: 'battle_log_viewed' }]);
  }, [reportAndPersistMissionEvents]);

  const handleBattleGuideOpen = useCallback(() => {
    reportAndPersistMissionEvents([{ type: 'attribute_battle_guide_viewed' }]);
  }, [reportAndPersistMissionEvents]);

  const handleHistoryOpponentCardView = useCallback(() => {
    reportAndPersistMissionEvents([{ type: 'history_opponent_detail_viewed' }]);
  }, [reportAndPersistMissionEvents]);

  const handleClaimMission = useCallback(
    (missionId: string) => {
      const result = claimMission(
        missionStateRef.current,
        economyRef.current,
        inventoryRef.current,
        missionId,
      );
      if (!result) return;
      setMissionState(result.state);
      setEconomy(result.economy);
      setInventory(result.inventory);
      economyRef.current = result.economy;
      inventoryRef.current = result.inventory;
      persistSave({
        missionState: result.state,
        economy: result.economy,
        inventory: result.inventory,
      });
    },
    [persistSave],
  );

  const handleClaimCategoryMissions = useCallback(
    (category: MissionCategory) => {
      const result = claimMissionsInCategory(
        missionStateRef.current,
        economyRef.current,
        inventoryRef.current,
        category,
      );
      if (result.missionIds.length === 0) return null;
      setMissionState(result.state);
      setEconomy(result.economy);
      setInventory(result.inventory);
      economyRef.current = result.economy;
      inventoryRef.current = result.inventory;
      persistSave({
        missionState: result.state,
        economy: result.economy,
        inventory: result.inventory,
      });
      return {
        pxGranted: result.pxGranted,
        jewelsGranted: result.jewelsGranted,
        universalShardsGranted: result.universalShardsGranted,
        missionCount: result.missionIds.length,
      };
    },
    [persistSave],
  );

  const handleChallengeMission = useCallback(
    (missionId: string) => {
      const mission = getMissionById(missionId);
      const target = mission ? getMissionChallengeTarget(mission.eventType) : null;
      if (!target) return;

      setBattleEndDock(false);
      clearHistoryRematch();
      resetHistoryRematchFlow();
      setDeckReorderMode(false);

      if (target.kind === 'battleHub') {
        setScreen('battleHub');
        return;
      }

      if (target.kind === 'records') {
        setBattleEndDock(false);
        clearHistoryRematch();
        resetHistoryRematchFlow();
        setScreen('records');
        return;
      }

      if (target.kind === 'deckReorder') {
        setDetailCardId(null);
        setDeckReorderMode(true);
        setScreen('deck');
        return;
      }

      if (target.kind === 'deckCardDetail') {
        setDeckReorderMode(false);
        setScreen('deck');
        const deck = normalizeDeckLayout(
          decksRef.current[activeDeckIndexRef.current] ?? [],
        );
        const card = deck.find((slot) => slot != null && !isCardLost(slot));
        setDetailCardId(card?.id ?? null);
        return;
      }

      if (target.kind === 'createCard') {
        const deck = normalizeDeckLayout(
          decksRef.current[activeDeckIndexRef.current] ?? [],
        );
        const hasEmptySlot = deck.some((slot) => slot == null);
        if (!hasEmptySlot) {
          setDetailCardId(null);
          setScreen('deck');
          return;
        }
        setEditingCard(null);
        setEditorReturnToDetail(false);
        setDetailCardId(null);
        setScreen('editor');
        return;
      }

      const deck = normalizeDeckLayout(
        decksRef.current[activeDeckIndexRef.current] ?? [],
      );
      const card = deck.find((slot) => slot != null);
      if (!card) {
        setEditingCard(null);
        setEditorReturnToDetail(false);
        setDetailCardId(null);
        setScreen('editor');
        return;
      }
      setEditingCard(card);
      setEditorReturnToDetail(false);
      setDetailCardId(null);
      setScreen('editor');
    },
    [clearHistoryRematch, resetHistoryRematchFlow],
  );

  const missionUnclaimedCount = countUnclaimedMissions(missionState);

  const openSettings = useCallback(() => {
    if (isTabId(screen) || screen === 'records') {
      settingsReturnScreenRef.current = screen;
    }
    setScreen('settings');
  }, [screen]);

  const closeSettings = useCallback(() => {
    setScreen(settingsReturnScreenRef.current);
  }, []);

  const openRecords = useCallback(() => {
    setBattleEndDock(false);
    clearHistoryRematch();
    resetHistoryRematchFlow();
    setScreen('records');
  }, [clearHistoryRematch, resetHistoryRematchFlow]);

  const closeRecords = useCallback(() => {
    setScreen('battleHub');
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
                if (skipsCreativeAd(subscriptionRef.current)) {
                  setEditingCard(card);
                  setEditorReturnToDetail(true);
                  setDeckReorderMode(false);
                  setScreen('editor');
                  return;
                }
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
            onAddCardToMemoryAlbum={addCardToMemoryAlbumFromDeck}
            onUnlockMemoryAlbumRow={unlockMemoryAlbumRowWithJewels}
            onOpenMemoryAlbum={() => setScreen('memoryAlbum')}
            memoryAlbum={memoryAlbum}
            inventory={inventory}
            onLimitBreakCard={limitBreakCard}
            onRetouchCardAttribute={retouchCardAttributeInDeck}
            onCommitRetouchCardAttribute={commitRetouchCardAttributeInDeck}
            onSelectCardAttribute={selectCardAttributeInDeck}
            paletteShopUnlocks={paletteShopUnlocks}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            onReorderDeck={reorderDeck}
            onMoveCardBetweenDecks={moveCardBetweenDecks}
            onUnlockDeck={unlockDeckWithJewels}
            onRenameDeck={handleRenameDeck}
            onEquipTalisman={equipTalismanOnCard}
            onUnequipTalisman={unequipTalismanOnCard}
            showLostCardDeckNotice={shouldShowLostCardDeckNoticeModal(adState)}
            onDismissLostCardDeckNoticeForToday={handleDismissLostCardDeckNoticeForToday}
            skipsCreativeAd={skipsCreativeAd(subscription)}
            onBattleGuideOpen={handleBattleGuideOpen}
          />
        )}
        {screen === 'memoryAlbum' && (
          <MemoryAlbumScreen
            album={memoryAlbum}
            jewels={economy.jewels}
            onBack={() => setScreen('deck')}
            onUnlockRow={unlockMemoryAlbumRowWithJewels}
            onDeleteFromAlbum={(cardId) => {
              const outcome = deleteCardFromMemoryAlbum(cardId);
              if (outcome) setDeleteResult(outcome);
            }}
          />
        )}
        {screen === 'mission' && (
          <MissionScreen
            userLevel={user?.level ?? 1}
            missionState={missionState}
            onClaimMission={handleClaimMission}
            onClaimCategoryMissions={handleClaimCategoryMissions}
            onChallengeMission={handleChallengeMission}
          />
        )}
        {screen === 'battleHub' && (
          <BattleHubScreen
            key={battleHubResetKey}
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            userLevel={user?.level ?? 1}
            onStartBattle={requestGoToBattleSetup}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
            onOpenRecords={openRecords}
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
            onBack={closeRecords}
            onOpponentCardView={handleHistoryOpponentCardView}
          />
        )}
        {screen === 'shop' && (
          <ShopScreen
            economy={economy}
            inventory={inventory}
            shopPurchase={shopPurchase}
            subscription={subscription}
            initialTab={shopInitialTab}
            purchaseMessage={shopPurchaseMessage}
            onPurchaseJewelPack={handlePurchaseJewelPack}
            onPurchaseTalisman={handlePurchaseTalisman}
            onPurchaseUniversalShard={handlePurchaseUniversalShard}
            onSubscribe={handleSubscribe}
            onDismissPurchaseMessage={() => setShopPurchaseMessage(null)}
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
            subscriptionLabel={subscriptionPlanLabel}
            soundEnabled={soundEnabled}
            onSoundEnabledChange={handleSoundEnabledChange}
            onBack={closeSettings}
            devCardOptions={devCardOptions}
            devDeckFillOptions={devDeckFillOptions}
            onDevSetLevel={handleDevSetLevel}
            onDevSetUnlockedDeckCount={handleDevSetUnlockedDeckCount}
            memoryAlbumUnlockedRows={memoryAlbum.unlockedRows}
            onDevSetMemoryAlbumExpansionRows={handleDevSetMemoryAlbumExpansionRows}
            onDevSetFreePixels={handleDevSetFreePixels}
            onDevSetJewels={handleDevSetJewels}
            onDevSetSubscription={handleDevSetSubscription}
            onDevSetAttributeShards={handleDevSetAttributeShards}
            onDevSetUniversalShards={handleDevSetUniversalShards}
            onDevSetTalisman={handleDevSetTalisman}
            onDevMarkCardLost={handleDevMarkCardLost}
            onDevFillDeckSlots={handleDevFillDeckSlots}
            onDevUnlockAllPaletteColors={handleDevUnlockAllPaletteColors}
            onDevClearPaletteShopUnlocks={handleDevClearPaletteShopUnlocks}
            onDevUnlockAllEditorTools={handleDevUnlockAllEditorTools}
            onDevClearEditorShopUnlocks={handleDevClearEditorShopUnlocks}
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
            canEditCardUserNote={editorCanEditCardUserNote}
            paletteShopUnlocks={paletteShopUnlocks}
            editorShopUnlocks={editorShopUnlocks}
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
            onOpenShopSubscription={openShopSubscriptionTab}
            onUnlockPaletteWithJewels={unlockPaletteWithJewelsHandler}
            onUnlockEditorFeatureWithJewels={unlockEditorFeatureWithJewelsHandler}
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
            onCancelMatch={
              isHistoryRematch
                ? handleCancelHistoryRematch
                : handleCancelBattleMatch
            }
            cancelMatchDisabled={
              isHistoryRematch
                ? false
                : economy.freePixels < BATTLE_MATCH_CANCEL_COST
            }
            cancelMatchShowsCost={!isHistoryRematch}
            cancelMatchCostPx={BATTLE_MATCH_CANCEL_COST}
            onFinish={handleBattleOutcome}
            onNewBattle={
              isHistoryRematch ? rematchSameOpponent : restartBattleFromEnd
            }
            newBattleDisabled={battleEndNewBattleDisabled}
            onBattleEndedChange={handleBattleEndedChange}
            onBattleLogViewed={handleBattleLogViewed}
          />
        )}
      </main>

      {showDock && (
        <AppDock
          activeTab={activeTab}
          onSelect={selectTab}
          tabBadges={
            missionUnclaimedCount > 0
              ? { mission: missionUnclaimedCount }
              : undefined
          }
        />
      )}

      {missionCompleteToast &&
        screen !== 'title' &&
        screen !== 'setup' && (
        <MissionCompleteToast message={missionCompleteToast} />
      )}

      {screen === 'deck' && deckIntroOpen && (
        <DeckIntroModal onClose={dismissDeckIntro} />
      )}

      {historyRematchFlow?.phase === 'rules' && (
        <HistoryRematchRulesModal
          onConfirm={proceedHistoryRematchAfterRules}
          onCancel={resetHistoryRematchFlow}
        />
      )}
      {battleStartPendingAd != null && (
        <MockRewardAdModal
          title="バトル開始のための広告視聴"
          message="3回に1回、バトル開始前にリワード広告の視聴が必要です（モック）"
          onComplete={() => {
            setBattleStartPendingAd((pending) => {
              if (pending?.kind === 'normal') {
                goToBattleSetup(pending.deckIndex);
              } else if (pending?.kind === 'historyRematch') {
                executeHistoryRematchBattle(pending.deckIndex);
              }
              return null;
            });
          }}
          onCancel={() => setBattleStartPendingAd(null)}
        />
      )}
      {graveyardVictoryDoubleCard != null && (
        <MockRewardAdModal
          title="報酬2倍のための広告視聴"
          message="広告視聴後、このバトルの EXP・コイン・かけら報酬が2倍になります（モック）"
          onComplete={() => {
            setGraveyardVictoryDoubleCard((card) => {
              if (card) {
                handleGraveyardPick(card, { doubleRewards: true });
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
      {deleteResult != null && (
        <CardDeleteResultModal
          outcome={deleteResult}
          onClose={() => setDeleteResult(null)}
        />
      )}
      {pendingGraveyardOutcome && (
        <GraveyardPickModal
          survivorCards={pendingGraveyardOutcome.survivorPlayerCards}
          graveyardCards={resolveGraveyardLootCards(pendingGraveyardOutcome)}
          expGain={pendingBattleExpGain}
          showVictoryDoubleAd={showGraveyardVictoryDoubleAd}
          alwaysDoubleRewards={graveyardAlwaysDoubleRewards}
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
