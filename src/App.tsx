import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AdState, Attribute, Card, MemoryAlbumState, MissionState, SaveData, ScreenId, ShopPurchaseState, SubscriptionPlan, UserProfile, UserEconomy, UserInventory, UserSubscription, BattleOutcome, BattleHistoryEntry } from './types';
import {
  isEmailLinkedUser,
  subscribeAuthState,
  syncDeviceLinkedEmailFromUser,
} from './auth';
import {
  cancelScheduledCloudSaveUpload,
  downloadCloudSaveNow,
  ensureLocalClientUpdatedAt,
  reconcileCloudSave,
  scheduleCloudSaveUpload,
  touchLocalClientUpdatedAt,
  uploadCloudSaveNow,
  writeLocalClientUpdatedAt,
} from './cloudSave';
import { appendBattleHistory, createBattleHistoryEntry, CPU_OPPONENT_LABEL } from './battleHistory';
import { isAttributeUnlockedAtLevel } from './config/attributeUnlock';
import { DECK_SLOT_COUNT, MAX_USER_LEVEL, DECK_MAX, USER_INITIAL_LEVEL, BATTLE_OUTCOME_HOLD_MS } from './config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from './config/devUserLevel';
import { updateDeckAtIndex, clampUnlockedDeckCount, moveCardBetweenDeckSlotsSwap, countDeckCards, getDeckCards, normalizeDeckLayout, isDeckBattleReady, setDeckNameAt, deckHasLostCard, getDeckDisplayName, isDeckSlotUnlocked, isDeckNameTakenByOtherDeck, resolveDeckUnlockOnLevelUp, hasHistoryRematchDeck, canUnlockDeckSlotWithJewels } from './deckSlots';
import type { DeckLayout } from './types';
import { applyCardSurvivalRecords, applyCardRevive, computeDeckPower, consumeTalismanFromCard, countEquippedTalismans, isCardLost, isTalismanEquipped, markCardLost, rescaleDeckBp, applyLimitBreakToCard, canLimitBreakCard, canReviveLostCard, describeLimitBreakRaritySuccessTitle, describeLimitBreakResult, getLimitBreakOutcomeKind, retouchCardAttribute, selectCardAttribute, tryEquipTalismanInDeck, tryUnequipTalismanInDeck, hasCardUserNote, type LimitBreakShardSpendPlan } from './card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired, BATTLE_MATCH_CANCEL_COST } from './config/economy';
import { buildBalancedCpuDeck, buildCpuCardsForDeckFill } from './game/cpuDeck';
import { getBattleResult } from './game';
import { resolveGraveyardLootCards } from './battle/graveyardLoot';
import { createInitialMissionState } from './user/missionState';
import { getBattlesDayKey, getMockAdsWatchedTotal, recordMockAdWatched } from './user/adState';
import { applyMissionResets, hasMissionPeriodExpired } from './mission/reset';
import {
  applyMissionEvents,
  claimCompletionBonus,
  claimMission,
  claimMissionsInCategory,
  countUnclaimedMissions,
  formatMissionCompleteToastMessage,
  getMissionById,
  getMissionChallengeTarget,
} from './mission';
import type {
  CompletionBonusCategory,
  MissionCategory,
  MissionEventType,
} from './mission';
import {
  mergeMissionEventResults,
  reportPermanentDeckWinAchievements,
  syncPermanentOwnershipAchievements,
} from './mission/permanentAchievementProgress';
import { loadSave, saveSave, SAVE_SCHEMA_VERSION, clearLocalSave } from './storage';
import { calcBattleExpGainForUser, createInitialProfile, createInitialEconomy, createInitialInventory, createInitialAdState, isProfileComplete, recordUserBattleOutcome, grantBattleExp, applyLevelUpEconomyRewards, applyLevelUpInventoryRewards, totalExpForLevel, addFreePixels, spendFreePixels, setFreePixels, setJewels, addLimitBreakShards, addInventoryCount, spendLimitBreakResources, spendJewels, getUniformAttributeShardsCount, setAllAttributeLimitBreakShards, setTalismanCount, setUniversalLimitBreakShards, isNormalBattleAdsEnabledAtUserLevel, shouldRequireBattleStartAd, shouldShowHistoryRematchRulesModal, dismissHistoryRematchRulesForToday, shouldShowLostCardDeckNoticeModal, dismissLostCardDeckNoticeForToday, addCardToMemoryAlbum, createInitialMemoryAlbum, memoryAlbumHasSpace, removeCardFromMemoryAlbumById, setMemoryAlbumUnlockedRows, unlockMemoryAlbumRow, devSetSubscriptionPlan, formatSubscriptionPlanLabel, canEditCardUserNote, canRenameCardForFree, canRenameDeck, hasPremiumAlwaysDouble, skipsBattleStartAd, skipsCreativeAd } from './user';
import { prepareHistoryOpponentDeck } from './historyRematch';
import {
  canPublishDeck,
  clearLocalPublishedDeckState,
  clearPublishedDeckRemoteIds,
  ensureAnonymousUserId,
  isOfflinePvpUnlockedAtUserLevel,
  listPublicGhostDecksByOwnerId,
  normalizePublishedDeckRemoteIds,
  normalizePublishedDeckSlots,
  OFFLINE_PVP_MIN_USER_LEVEL,
  republishOwnedPublishedDecks,
  setPublishedRemoteId,
  setPublishedSlot,
  unpublishDeck,
  upsertPublishedDeck,
  type PublicGhostDeck,
} from './offlinePvp';
import {
  canContinueOnlinePvpSession,
  closeOnlineBattleRoom,
  finalizeOnlineBattleIfEnded,
  applyOnlinePvpWalletTransfer,
  syncOnlineWalletBalance,
  isOnlinePvpUnlockedAtUserLevel,
  opponentIdentity,
  shouldApplyOnlineRoomUpdate,
  shouldReturnToOnlineDeckSelect,
  submitOnlineRematchReady,
  submitOnlineSetup,
  subscribeOnlineBattleRoom,
  type OnlineBattleRole,
  type OnlineBattleRoom,
} from './onlinePvp';
import { isSupabaseConfigured } from './supabase/client';
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
  mockCancelSubscription,
  normalizeShopPurchaseState,
  normalizeUserSubscription,
  getMockLifetimeSpendYen,
} from './user/shop';
import {
  calcReviveCost,
  calcGraveyardShardReward,
  calcLostCardDeleteRewards,
  calcHistoryRematchRewardPixels,
  calcSurvivorPixelsForBattleVictory,
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
import { OfflinePvpDeckListScreen } from './components/OfflinePvpDeckListScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { OnlinePvpScreen } from './components/OnlinePvpScreen';
import { OnlinePvpOpponentLeftModal } from './components/OnlinePvpBattleEndModal';
import { MockRewardAdModal } from './components/MockRewardAdModal';
import { HistoryRematchRulesModal } from './components/HistoryRematchRulesModal';
import { HistoryRematchRewardModal } from './components/HistoryRematchRewardModal';
import { RecordsScreen } from './components/RecordsScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import {
  ProfileScreen,
  type ProfileDisplayUser,
  type ProfilePublishedDeck,
} from './components/ProfileScreen';
import { AvatarDetailScreen } from './components/AvatarDetailScreen';
import { AvatarEditorScreen } from './components/AvatarEditorScreen';
import { ShopScreen } from './components/ShopScreen';
import { SetupScreen } from './components/SetupScreen';
import { TitleScreen } from './components/TitleScreen';
import { DeckIntroModal } from './components/DeckIntroModal';
import { UserProfileBar } from './components/UserProfileBar';
import { isDockVisible, isTabId, type TabId } from './navigation/screenIds';
import {
  getPublicProfileByOwnerId,
  saveCurrentPublicProfile,
} from './publicProfile';
import { normalizeSoundEnabled } from './user/preferences';
import { bgmPlayer } from './audio/bgmPlayer';
import { useBgm } from './audio/useBgm';
import './App.css';

function initialScreen(user: UserProfile | null): ScreenId {
  return isProfileComplete(user) ? 'deck' : 'setup';
}

interface RemoteProfileSource {
  ownerId?: string;
  user: ProfileDisplayUser;
  publishedDecks: ProfilePublishedDeck[];
}

interface RemoteProfileView extends RemoteProfileSource {
  source: RemoteProfileSource;
  status: 'loading' | 'loaded' | 'error' | 'snapshot';
}

function createRemoteProfileSourceFromGhost(
  ghost: PublicGhostDeck,
): RemoteProfileSource {
  return {
    ...(ghost.ownerId ? { ownerId: ghost.ownerId } : {}),
    user: {
      username: ghost.authorName,
      level: ghost.authorLevel,
      cpuBattleWins: null,
      cpuBattleLosses: null,
      offlinePvpBattleWins: ghost.offlinePvpWins,
      offlinePvpBattleLosses: ghost.offlinePvpLosses,
      onlinePvpBattleWins: null,
      onlinePvpBattleLosses: null,
    },
    publishedDecks: [
      {
        slotIndex: ghost.slotIndex,
        name: ghost.deckName,
        cards: ghost.deck,
        ghostId: ghost.id,
        ...(ghost.ownerId ? { ownerId: ghost.ownerId } : {}),
      },
    ],
  };
}

function createRemoteProfileSourceFromHistory(
  entry: BattleHistoryEntry,
): RemoteProfileSource {
  return {
    ...(entry.opponentOwnerId
      ? { ownerId: entry.opponentOwnerId }
      : {}),
    user: {
      username: entry.opponentName,
      level: entry.opponentLevel,
      cpuBattleWins: null,
      cpuBattleLosses: null,
      offlinePvpBattleWins: null,
      offlinePvpBattleLosses: null,
      onlinePvpBattleWins: null,
      onlinePvpBattleLosses: null,
    },
    publishedDecks: [
      {
        slotIndex: 0,
        name: '対戦時のデッキ',
        cards: entry.opponentDeck,
        ...(entry.opponentOwnerId
          ? { ownerId: entry.opponentOwnerId }
          : {}),
      },
    ],
  };
}

function createRemoteProfileSnapshot(
  source: RemoteProfileSource,
  status: RemoteProfileView['status'],
): RemoteProfileView {
  return {
    source,
    ...source,
    status,
  };
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
  const [publishedDeckSlots, setPublishedDeckSlots] = useState(() =>
    normalizePublishedDeckSlots(initialSave.publishedDeckSlots),
  );
  const [publishedDeckRemoteIds, setPublishedDeckRemoteIds] = useState(() =>
    normalizePublishedDeckRemoteIds(initialSave.publishedDeckRemoteIds),
  );
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [supabaseOwnerId, setSupabaseOwnerId] = useState<string | null>(null);
  const publishedDeckSlotsRef = useRef(publishedDeckSlots);
  const publishedDeckRemoteIdsRef = useRef(publishedDeckRemoteIds);
  const authUserIdRef = useRef<string | null>(null);
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
  const deckIntroSeenPersistedRef = useRef(initialSave.deckIntroSeen === true);

  const activeDeck = useMemo(
    () => normalizeDeckLayout(decks[activeDeckIndex] ?? []),
    [activeDeckIndex, decks],
  );

  const activeDeckCardCount = useMemo(
    () => countDeckCards(activeDeck),
    [activeDeck],
  );

  const profilePublishedDecks = useMemo(
    () =>
      Array.from({ length: unlockedDeckCount }, (_, slotIndex) => {
        if (publishedDeckSlots[slotIndex] !== true) return null;
        const layout = normalizeDeckLayout(decks[slotIndex] ?? []);
        if (!canPublishDeck(layout)) return null;
        return {
          slotIndex,
          name: getDeckDisplayName(slotIndex, deckNames),
          cards: getDeckCards(layout),
        };
      }).filter((deck) => deck != null),
    [
      deckNames,
      decks,
      publishedDeckSlots,
      unlockedDeckCount,
    ],
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
  const [battleHubModeScreenOpen, setBattleHubModeScreenOpen] = useState(false);
  const [battleEndDock, setBattleEndDock] = useState(false);
  const [isHistoryRematch, setIsHistoryRematch] = useState(false);
  const [isOfflinePvp, setIsOfflinePvp] = useState(false);
  const [isOnlinePvp, setIsOnlinePvp] = useState(false);
  const [onlinePvpRoom, setOnlinePvpRoom] = useState<OnlineBattleRoom | null>(null);
  const [onlinePvpRole, setOnlinePvpRole] = useState<OnlineBattleRole | null>(null);
  const [onlinePvpOpponentLeftOpen, setOnlinePvpOpponentLeftOpen] = useState(false);
  const [historyRematchFlow, setHistoryRematchFlow] = useState<{
    entry: BattleHistoryEntry;
    phase: 'rules' | 'deckSelect';
  } | null>(null);
  const [offlinePvpFlow, setOfflinePvpFlow] = useState<{
    ghost: PublicGhostDeck;
    phase: 'deckSelect';
  } | null>(null);
  const [battleStartPendingAd, setBattleStartPendingAd] = useState<{
    kind: 'normal' | 'historyRematch' | 'offlinePvp';
    deckIndex: number;
  } | null>(null);
  const [graveyardVictoryDoubleCard, setGraveyardVictoryDoubleCard] =
    useState<Card | null>(null);
  const [graveyardDoubleRewardsFromAd, setGraveyardDoubleRewardsFromAd] =
    useState(false);
  const [historyRematchVictoryDoublePending, setHistoryRematchVictoryDoublePending] =
    useState(false);
  const [historyRematchDoubleRewardsFromAd, setHistoryRematchDoubleRewardsFromAd] =
    useState(false);
  const [pendingHistoryRematchOutcome, setPendingHistoryRematchOutcome] =
    useState<BattleOutcome | null>(null);
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
  const [remoteProfileView, setRemoteProfileView] =
    useState<RemoteProfileView | null>(null);

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
  const isOfflinePvpRef = useRef(false);
  const isOnlinePvpRef = useRef(false);
  const onlinePvpRoomRef = useRef<OnlineBattleRoom | null>(null);
  const onlinePvpRoleRef = useRef<OnlineBattleRole | null>(null);
  /** rematch_wait の px 移動を両端末で冪等に1回だけ適用するためのキー */
  const onlinePxSettledKeyRef = useRef<string | null>(null);
  const onlineBattleSetupMountRef = useRef<{
    roomId: string;
    status: OnlineBattleRoom['status'];
    deckKey: string;
  } | null>(null);
  const historyRematchEntryRef = useRef<BattleHistoryEntry | null>(null);
  const offlinePvpGhostRef = useRef<PublicGhostDeck | null>(null);
  const battleStartSnapshotRef = useRef<{
    deckIndex: number;
    playerDeck: Card[];
    playerLevel: number;
  } | null>(null);
  const battleOutcomeHoldTimerRef = useRef<number | null>(null);
  const settingsReturnScreenRef = useRef<ScreenId>('deck');
  const profileReturnScreenRef = useRef<ScreenId>('deck');
  const remoteProfileRequestRef = useRef(0);
  useEffect(() => {
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
    isOnlinePvpRef.current = isOnlinePvp;
    onlinePvpRoomRef.current = onlinePvpRoom;
    onlinePvpRoleRef.current = onlinePvpRole;
    publishedDeckSlotsRef.current = publishedDeckSlots;
    publishedDeckRemoteIdsRef.current = publishedDeckRemoteIds;
  });

  const devPreferSavedLevelRef = useRef(initialSave.devPreferSavedLevel === true);
  const devFileOverrideLevelRef = useRef<number | null | undefined>(
    initialSave.devFileOverrideLevel,
  );

  const clearBattleOutcomeHoldTimer = useCallback(() => {
    if (battleOutcomeHoldTimerRef.current != null) {
      window.clearTimeout(battleOutcomeHoldTimerRef.current);
      battleOutcomeHoldTimerRef.current = null;
    }
  }, []);

  const scheduleBattleOutcomeModal = useCallback(
    (showModal: () => void) => {
      clearBattleOutcomeHoldTimer();
      battleOutcomeHoldTimerRef.current = window.setTimeout(() => {
        battleOutcomeHoldTimerRef.current = null;
        showModal();
      }, BATTLE_OUTCOME_HOLD_MS);
    },
    [clearBattleOutcomeHoldTimer],
  );

  useEffect(() => () => clearBattleOutcomeHoldTimer(), [clearBattleOutcomeHoldTimer]);

  const persistSave = useCallback(
    (next: {
      user?: UserProfile | null;
      economy?: UserEconomy;
      inventory?: UserInventory;
      adState?: AdState;
      talismanStarterGranted?: boolean;
      decks?: DeckLayout[];
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
      publishedDeckSlots?: boolean[];
      publishedDeckRemoteIds?: (string | null)[];
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
      const payload: SaveData = {
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
        publishedDeckSlots:
          next.publishedDeckSlots ?? publishedDeckSlotsRef.current,
        publishedDeckRemoteIds:
          next.publishedDeckRemoteIds ?? publishedDeckRemoteIdsRef.current,
        ...(devPreferSavedLevelRef.current
          ? {
              devPreferSavedLevel: true as const,
              devFileOverrideLevel:
                devFileOverrideLevelRef.current ?? DEV_USER_LEVEL_OVERRIDE ?? null,
            }
          : {}),
      };
      touchLocalClientUpdatedAt();
      saveSave(payload);
      scheduleCloudSaveUpload(payload);
    },
    [activeDeckIndex, deckIntroSeen, decks, lastBattleDeckIndex, soundEnabled, unlockedDeckCount, user],
  );

  const applyDownloadedCloudSave = useCallback(
    (save: SaveData, clientUpdatedAt: string) => {
      writeLocalClientUpdatedAt(clientUpdatedAt);
      saveSave(save);
      setUser(save.user);
      setEconomy(save.economy ?? createInitialEconomy());
      setInventory(save.inventory ?? createInitialInventory());
      setTalismanStarterGranted(save.talismanStarterGranted === true);
      setAdState(save.adState ?? createInitialAdState());
      setDecks(save.decks);
      setActiveDeckIndex(save.activeDeckIndex);
      setLastBattleDeckIndex(save.lastBattleDeckIndex);
      setUnlockedDeckCount(save.unlockedDeckCount);
      setDeckNames(save.deckNames);
      setPublishedDeckSlots(normalizePublishedDeckSlots(save.publishedDeckSlots));
      setPublishedDeckRemoteIds(
        normalizePublishedDeckRemoteIds(save.publishedDeckRemoteIds),
      );
      setPaletteShopUnlocks(normalizePaletteShopUnlocks(save.paletteShopUnlocks));
      setEditorShopUnlocks(normalizeEditorShopUnlocks(save.editorShopUnlocks));
      setMemoryAlbum(save.memoryAlbum ?? createInitialMemoryAlbum());
      setShopPurchase(normalizeShopPurchaseState(save.shopPurchase));
      setSubscription(normalizeUserSubscription(save.subscription));
      setMissionState(
        applyMissionResets(save.missionState ?? createInitialMissionState()),
      );
      setSoundEnabled(normalizeSoundEnabled(save.soundEnabled));
      setDeckIntroSeen(save.deckIntroSeen === true);
      deckIntroSeenPersistedRef.current = save.deckIntroSeen === true;
      setBattleHistory(save.battleHistory ?? []);
      if (save.devPreferSavedLevel === true) {
        devPreferSavedLevelRef.current = true;
        devFileOverrideLevelRef.current = save.devFileOverrideLevel;
      }
    },
    [],
  );

  const runCloudReconcile = useCallback(async () => {
    const result = await reconcileCloudSave(loadSave());
    if (!result.ok) return result;
    if (result.action === 'downloaded') {
      applyDownloadedCloudSave(result.save, result.clientUpdatedAt);
    }
    return result;
  }, [applyDownloadedCloudSave]);

  const handleCloudSaveUpload = useCallback(async (): Promise<string> => {
    const result = await uploadCloudSaveNow(loadSave());
    if (!result.ok) throw new Error(result.error);
    return 'クラウドに保存しました';
  }, []);

  const handleCloudRestoreDownload = useCallback(async (): Promise<string> => {
    const result = await downloadCloudSaveNow(loadSave());
    if (!result.ok) throw new Error(result.error);
    if (result.action === 'downloaded') {
      applyDownloadedCloudSave(result.save, result.clientUpdatedAt);
      return 'クラウドから復元しました';
    }
    throw new Error('クラウドに復元できるデータがありません');
  }, [applyDownloadedCloudSave]);

  const handleUsernameChange = useCallback(
    (username: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, username };
        persistSave({ user: next });
        return next;
      });
    },
    [persistSave],
  );

  const handleProfileCommentChange = useCallback(
    (profileComment: string | undefined) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (profileComment) {
          next.profileComment = profileComment;
        } else {
          delete next.profileComment;
        }
        persistSave({ user: next });
        return next;
      });
    },
    [persistSave],
  );

  const handleAccountDeleted = useCallback(() => {
    cancelScheduledCloudSaveUpload();
    clearLocalSave();
    const fresh = loadSave();
    const clearedPublish = clearLocalPublishedDeckState();

    setUser(null);
    setEconomy(fresh.economy ?? createInitialEconomy());
    setInventory(fresh.inventory ?? createInitialInventory());
    setTalismanStarterGranted(false);
    setAdState(fresh.adState ?? createInitialAdState());
    setDecks(fresh.decks);
    setActiveDeckIndex(fresh.activeDeckIndex);
    setLastBattleDeckIndex(fresh.lastBattleDeckIndex);
    setUnlockedDeckCount(fresh.unlockedDeckCount);
    setDeckNames(undefined);
    setPublishedDeckSlots(clearedPublish.slots);
    setPublishedDeckRemoteIds(clearedPublish.remoteIds);
    publishedDeckSlotsRef.current = clearedPublish.slots;
    publishedDeckRemoteIdsRef.current = clearedPublish.remoteIds;
    setPaletteShopUnlocks([]);
    setEditorShopUnlocks([]);
    setMemoryAlbum(fresh.memoryAlbum ?? createInitialMemoryAlbum());
    setShopPurchase(createInitialShopPurchaseState());
    setSubscription(createInitialSubscription());
    setMissionState(createInitialMissionState());
    setBattleHistory([]);
    setDeckIntroSeen(false);
    setSupabaseOwnerId(null);
    authUserIdRef.current = null;

    void ensureAnonymousUserId().then((id) => {
      if (id) setSupabaseOwnerId(id);
    });

    setScreen('setup');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void ensureAnonymousUserId().then((id) => {
      if (id) setSupabaseOwnerId(id);
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isProfileComplete(user)) return;
    const timeoutId = window.setTimeout(() => {
      void saveCurrentPublicProfile(user).then((result) => {
        if (!result.ok && result.reason === 'save_failed') {
          console.warn(
            '[publicProfile] failed to sync current profile',
            result.error,
          );
        }
      });
    }, 800);
    return () => window.clearTimeout(timeoutId);
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    ensureLocalClientUpdatedAt();
    let cancelled = false;

    const applyReconcile = async () => {
      const result = await runCloudReconcile();
      if (cancelled || !result || !result.ok) return;
    };

    void applyReconcile();

    const unsubscribe = subscribeAuthState((authUser) => {
      const prevAuthUserId = authUserIdRef.current;
      const nextAuthUserId = authUser?.id ?? null;
      authUserIdRef.current = nextAuthUserId;

      if (authUser) setSupabaseOwnerId(authUser.id);
      syncDeviceLinkedEmailFromUser(authUser);
      if (!isEmailLinkedUser(authUser)) {
        cancelScheduledCloudSaveUpload();
      }

      const authUserChanged =
        prevAuthUserId !== null && prevAuthUserId !== nextAuthUserId;

      if (authUserChanged) {
        if (!isEmailLinkedUser(authUser)) {
          const cleared = clearLocalPublishedDeckState();
          publishedDeckSlotsRef.current = cleared.slots;
          publishedDeckRemoteIdsRef.current = cleared.remoteIds;
          setPublishedDeckSlots(cleared.slots);
          setPublishedDeckRemoteIds(cleared.remoteIds);
          persistSave({
            publishedDeckSlots: cleared.slots,
            publishedDeckRemoteIds: cleared.remoteIds,
          });
        } else {
          const clearedIds = clearPublishedDeckRemoteIds();
          publishedDeckRemoteIdsRef.current = clearedIds;
          setPublishedDeckRemoteIds(clearedIds);
          persistSave({ publishedDeckRemoteIds: clearedIds });
          const profile = userRef.current;
          if (profile && isProfileComplete(profile)) {
            void republishOwnedPublishedDecks({
              publishedSlots: publishedDeckSlotsRef.current,
              remoteIds: clearedIds,
              decks: decksRef.current,
              deckNames: deckNamesRef.current,
              user: profile,
              unlockedDeckCount: unlockedDeckCountRef.current,
              resetRemoteIds: true,
            }).then((result) => {
              if (!result.changed) return;
              publishedDeckSlotsRef.current = result.slots;
              publishedDeckRemoteIdsRef.current = result.remoteIds;
              setPublishedDeckSlots(result.slots);
              setPublishedDeckRemoteIds(result.remoteIds);
              persistSave({
                publishedDeckSlots: result.slots,
                publishedDeckRemoteIds: result.remoteIds,
              });
            });
          }
        }
      }

      if (isEmailLinkedUser(authUser)) {
        void applyReconcile();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      cancelScheduledCloudSaveUpload();
    };
  }, [persistSave, runCloudReconcile]);

  const handleToggleDeckPublish = useCallback(
    async (published: boolean) => {
      const profile = userRef.current;
      if (!profile || !isProfileComplete(profile)) {
        setPublishError('ユーザー登録後に公開できます');
        return;
      }
      if (!isSupabaseConfigured()) {
        setPublishError('Supabase が設定されていません（.env を確認してください）');
        return;
      }
      if (
        published &&
        !isOfflinePvpUnlockedAtUserLevel(profile.level)
      ) {
        setPublishError(
          `公開デッキへの登録はユーザーレベル${OFFLINE_PVP_MIN_USER_LEVEL}到達後に利用できます`,
        );
        return;
      }

      const slotIndex = activeDeckIndexRef.current;
      const layout = normalizeDeckLayout(decksRef.current[slotIndex] ?? []);
      setPublishBusy(true);
      setPublishError(null);

      if (published) {
        const result = await upsertPublishedDeck({
          slotIndex,
          deckName: getDeckDisplayName(slotIndex, deckNamesRef.current),
          deck: layout,
          user: profile,
          remoteId: publishedDeckRemoteIdsRef.current[slotIndex],
        });
        if (!result.ok) {
          setPublishError(result.error);
          setPublishBusy(false);
          return;
        }
        const ownerId = await ensureAnonymousUserId();
        if (ownerId) setSupabaseOwnerId(ownerId);
        const nextSlots = setPublishedSlot(
          publishedDeckSlotsRef.current,
          slotIndex,
          true,
        );
        const nextIds = setPublishedRemoteId(
          publishedDeckRemoteIdsRef.current,
          slotIndex,
          result.remoteId,
        );
        publishedDeckSlotsRef.current = nextSlots;
        publishedDeckRemoteIdsRef.current = nextIds;
        setPublishedDeckSlots(nextSlots);
        setPublishedDeckRemoteIds(nextIds);
        persistSave({
          publishedDeckSlots: nextSlots,
          publishedDeckRemoteIds: nextIds,
        });
      } else {
        const result = await unpublishDeck({
          slotIndex,
          remoteId: publishedDeckRemoteIdsRef.current[slotIndex],
        });
        if (!result.ok) {
          setPublishError(result.error);
          setPublishBusy(false);
          return;
        }
        const nextSlots = setPublishedSlot(
          publishedDeckSlotsRef.current,
          slotIndex,
          false,
        );
        const nextIds = setPublishedRemoteId(
          publishedDeckRemoteIdsRef.current,
          slotIndex,
          null,
        );
        publishedDeckSlotsRef.current = nextSlots;
        publishedDeckRemoteIdsRef.current = nextIds;
        setPublishedDeckSlots(nextSlots);
        setPublishedDeckRemoteIds(nextIds);
        persistSave({
          publishedDeckSlots: nextSlots,
          publishedDeckRemoteIds: nextIds,
        });
      }
      setPublishBusy(false);
    },
    [persistSave],
  );

  /** 公開中スロットをデッキ変更に合わせて自動同期 */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const profile = user;
    if (!profile || !isProfileComplete(profile)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await republishOwnedPublishedDecks({
          publishedSlots: publishedDeckSlotsRef.current,
          remoteIds: publishedDeckRemoteIdsRef.current,
          decks,
          deckNames,
          user: profile,
          unlockedDeckCount,
        });
        if (cancelled || !result.changed) return;
        publishedDeckSlotsRef.current = result.slots;
        publishedDeckRemoteIdsRef.current = result.remoteIds;
        setPublishedDeckSlots(result.slots);
        setPublishedDeckRemoteIds(result.remoteIds);
        persistSave({
          publishedDeckSlots: result.slots,
          publishedDeckRemoteIds: result.remoteIds,
        });
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deckNames, decks, persistSave, unlockedDeckCount, user]);

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

  const recordMockAdWatchedAndPersist = useCallback(() => {
    const next = recordMockAdWatched(adStateRef.current);
    adStateRef.current = next;
    setAdState(next);
    persistSave({ adState: next });
  }, [persistSave]);

  const syncAndPersistOwnershipAchievements = useCallback(
    (
      savePatch?: Omit<Parameters<typeof persistSave>[0], 'missionState'>,
      date: Date = new Date(),
    ) => {
      const userLevel = userRef.current?.level ?? 1;
      const prev = missionStateRef.current;
      const result = syncPermanentOwnershipAchievements(
        prev,
        decksRef.current,
        memoryAlbumRef.current,
        userLevel,
        date,
      );
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
    const timerId = window.setTimeout(() => {
      setMissionCompleteToast(null);
    }, 4000);
    return () => window.clearTimeout(timerId);
  }, [missionCompleteToast]);

  const dismissDeckIntro = useCallback(() => {
    setDeckIntroSeen(true);
  }, []);

  // イントロ未読でデッキ画面に入ったときの表示可否は state 同期ではなく描画時に導出する。
  const deckIntroPending =
    !!user && !deckIntroSeen && screen === 'deck';
  // デッキが満杯の状態で開いた場合はイントロを表示せず「既読」とみなす（描画時に state を調整）。
  if (deckIntroPending && activeDeckCardCount >= DECK_MAX) {
    setDeckIntroSeen(true);
  }
  const deckIntroOpen = deckIntroPending && activeDeckCardCount < DECK_MAX;

  // 「既読」への変化のみを一度だけ永続化する（effect 内で setState はしない）。
  useEffect(() => {
    if (deckIntroSeen && !deckIntroSeenPersistedRef.current) {
      deckIntroSeenPersistedRef.current = true;
      persistSave({ deckIntroSeen: true });
    } else if (!deckIntroSeen && deckIntroSeenPersistedRef.current) {
      deckIntroSeenPersistedRef.current = false;
    }
  }, [deckIntroSeen, persistSave]);

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
    if (!user || !isProfileComplete(user)) return;
    syncAndPersistOwnershipAchievements();
  }, [user, syncAndPersistOwnershipAchievements]);

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

  const handleCancelSubscribe = useCallback(() => {
    const outcome = mockCancelSubscription(subscriptionRef.current);
    if (outcome.ok) {
      setSubscription(outcome.subscription);
      subscriptionRef.current = outcome.subscription;
      setShopPurchaseMessage(outcome.message);
      persistSave({ subscription: outcome.subscription });
    } else {
      setShopPurchaseMessage(outcome.message);
    }
  }, [persistSave]);

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

  const clearOfflinePvp = useCallback(() => {
    setIsOfflinePvp(false);
    isOfflinePvpRef.current = false;
    offlinePvpGhostRef.current = null;
  }, []);

  const clearOnlinePvp = useCallback(() => {
    setIsOnlinePvp(false);
    isOnlinePvpRef.current = false;
    setOnlinePvpRoom(null);
    setOnlinePvpRole(null);
    onlinePvpRoomRef.current = null;
    onlinePvpRoleRef.current = null;
    onlineBattleSetupMountRef.current = null;
    onlinePxSettledKeyRef.current = null;
  }, []);

  const leaveOnlinePvpRoom = useCallback(
    async (options?: { skipClose?: boolean }) => {
      const room = onlinePvpRoomRef.current;
      const role = onlinePvpRoleRef.current;
      if (room && role && !options?.skipClose) {
        await closeOnlineBattleRoom(room.id, role);
      }
      clearOnlinePvp();
      setOnlinePvpOpponentLeftOpen(false);
      setScreen('battleHub');
    },
    [clearOnlinePvp],
  );

  const resetHistoryRematchFlow = useCallback(() => {
    setHistoryRematchFlow(null);
    setBattleStartPendingAd((pending) =>
      pending?.kind === 'historyRematch' ? null : pending,
    );
  }, []);

  const resetOfflinePvpFlow = useCallback(() => {
    setOfflinePvpFlow(null);
    setBattleStartPendingAd((pending) =>
      pending?.kind === 'offlinePvp' ? null : pending,
    );
  }, []);

  const openOfflinePvpList = useCallback(() => {
    const level = userRef.current?.level ?? USER_INITIAL_LEVEL;
    if (!isOfflinePvpUnlockedAtUserLevel(level)) {
      return;
    }
    clearBattleOutcomeHoldTimer();
    clearHistoryRematch();
    resetHistoryRematchFlow();
    clearOfflinePvp();
    resetOfflinePvpFlow();
    setBattleEndDock(false);
    setScreen('offlinePvpList');
  }, [
    clearBattleOutcomeHoldTimer,
    clearHistoryRematch,
    clearOfflinePvp,
    resetHistoryRematchFlow,
    resetOfflinePvpFlow,
  ]);

  const closeOfflinePvpList = useCallback(() => {
    resetOfflinePvpFlow();
    clearOfflinePvp();
    setScreen('battleHub');
  }, [clearOfflinePvp, resetOfflinePvpFlow]);

  const openOnlinePvp = useCallback(() => {
    const level = userRef.current?.level ?? USER_INITIAL_LEVEL;
    if (!isOnlinePvpUnlockedAtUserLevel(level)) return;
    clearBattleOutcomeHoldTimer();
    clearHistoryRematch();
    resetHistoryRematchFlow();
    clearOfflinePvp();
    resetOfflinePvpFlow();
    clearOnlinePvp();
    setBattleEndDock(false);
    setScreen('onlinePvp');
  }, [
    clearBattleOutcomeHoldTimer,
    clearHistoryRematch,
    clearOfflinePvp,
    clearOnlinePvp,
    resetHistoryRematchFlow,
    resetOfflinePvpFlow,
  ]);

  const handleOnlineRoomUpdated = useCallback(
    (room: OnlineBattleRoom, role: OnlineBattleRole) => {
      const current = onlinePvpRoomRef.current;
      if (shouldApplyOnlineRoomUpdate(current, room)) {
        setOnlinePvpRoom(room);
        onlinePvpRoomRef.current = room;
      }
      setOnlinePvpRole(role);
      onlinePvpRoleRef.current = role;

      if (
        room.status === 'setup' ||
        room.status === 'battle' ||
        room.status === 'rematch_wait'
      ) {
        const myDeck = role === 'host' ? room.hostDeck : room.guestDeck;
        const oppDeck = role === 'host' ? room.guestDeck : room.hostDeck;
        if (!myDeck || !oppDeck) return;

        setIsOnlinePvp(true);
        isOnlinePvpRef.current = true;
        setIsOfflinePvp(false);
        isOfflinePvpRef.current = false;
        clearHistoryRematch();

        const opp = opponentIdentity(room, role);
        const deckKey = `${myDeck.map((c) => `${c.id}:${c.bp}`).join(',')}|${oppDeck.map((c) => `${c.id}:${c.bp}`).join(',')}`;
        const mountCtx = onlineBattleSetupMountRef.current;
        const deckChanged =
          mountCtx?.roomId !== room.id || mountCtx?.deckKey !== deckKey;
        if (deckChanged) {
          setBattlePlayerDeck(structuredClone(myDeck));
          setCpuDeck(structuredClone(oppDeck));
        }
        setCpuOpponent({ name: opp.name, level: opp.level });
        battleStartSnapshotRef.current = {
          deckIndex: activeDeckIndexRef.current,
          playerDeck: structuredClone(myDeck),
          playerLevel: userRef.current?.level ?? 1,
        };
        const shouldRemountBattleSetup =
          deckChanged ||
          (room.status === 'setup' && mountCtx?.status !== 'setup');
        if (shouldRemountBattleSetup) {
          setBattleSetupKey((k) => k + 1);
          onlineBattleSetupMountRef.current = {
            roomId: room.id,
            status: room.status,
            deckKey,
          };
        } else if (mountCtx?.roomId === room.id) {
          onlineBattleSetupMountRef.current = {
            ...mountCtx,
            status: room.status,
          };
        }
        setBattleEndDock(false);
        setScreen('battleSetup');
      }
    },
    [clearHistoryRematch],
  );

  const startOfflinePvpDeckSelect = useCallback((ghost: PublicGhostDeck) => {
    offlinePvpGhostRef.current = ghost;
    setOfflinePvpFlow({ ghost, phase: 'deckSelect' });
  }, []);

  const goToBattleSetup = useCallback(
    (deckIndex?: number) => {
      clearBattleOutcomeHoldTimer();
      clearHistoryRematch();
      resetHistoryRematchFlow();
      clearOfflinePvp();
      resetOfflinePvpFlow();
      clearOnlinePvp();
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
    [
      clearBattleOutcomeHoldTimer,
      clearHistoryRematch,
      clearOfflinePvp,
      clearOnlinePvp,
      resetHistoryRematchFlow,
      resetOfflinePvpFlow,
      persistSave,
      user?.level,
    ],
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

  const executeOfflinePvpBattle = useCallback(
    (deckIndex: number) => {
      const ghost =
        offlinePvpFlow?.ghost ?? offlinePvpGhostRef.current;
      if (!ghost) return;

      clearBattleOutcomeHoldTimer();
      clearHistoryRematch();
      resetHistoryRematchFlow();

      const level = userRef.current?.level ?? 1;
      const layout = normalizeDeckLayout(decksRef.current[deckIndex] ?? []);
      if (!isDeckBattleReady(layout)) return;

      const playerDeck = getDeckCards(layout);
      battleStartSnapshotRef.current = {
        deckIndex,
        playerDeck: structuredClone(playerDeck),
        playerLevel: level,
      };
      setBattlePlayerDeck(playerDeck);
      setActiveDeckIndex(deckIndex);
      setLastBattleDeckIndex(deckIndex);
      lastBattleDeckIndexRef.current = deckIndex;
      activeDeckIndexRef.current = deckIndex;
      persistSave({
        activeDeckIndex: deckIndex,
        lastBattleDeckIndex: deckIndex,
      });

      setIsHistoryRematch(false);
      isHistoryRematchRef.current = false;
      setIsOfflinePvp(true);
      isOfflinePvpRef.current = true;
      offlinePvpGhostRef.current = ghost;

      setCpuDeck(prepareHistoryOpponentDeck(ghost.deck, playerDeck));
      setCpuOpponent({
        name: ghost.authorName,
        level: ghost.authorLevel,
      });

      if (isNormalBattleAdsEnabledAtUserLevel(level)) {
        const nextAdState = {
          ...adStateRef.current,
          battleStarts: (adStateRef.current.battleStarts ?? 0) + 1,
        };
        adStateRef.current = nextAdState;
        setAdState(nextAdState);
        persistSave({ adState: nextAdState });
      }

      setBattleStartPendingAd(null);
      resetOfflinePvpFlow();
      setBattleSetupKey((k) => k + 1);
      setBattleEndDock(false);
      setScreen('battleSetup');
    },
    [
      clearBattleOutcomeHoldTimer,
      clearHistoryRematch,
      offlinePvpFlow,
      persistSave,
      resetHistoryRematchFlow,
      resetOfflinePvpFlow,
    ],
  );

  const startOfflinePvpBattle = useCallback(
    (deckIndex: number) => {
      const level = userRef.current?.level ?? 1;
      if (
        isNormalBattleAdsEnabledAtUserLevel(level) &&
        !skipsBattleStartAd(subscriptionRef.current) &&
        shouldRequireBattleStartAd(adStateRef.current.battleStarts ?? 0)
      ) {
        setBattleStartPendingAd({ kind: 'offlinePvp', deckIndex });
        return;
      }
      executeOfflinePvpBattle(deckIndex);
    },
    [executeOfflinePvpBattle],
  );

  const handleCancelOfflinePvpMatch = useCallback(() => {
    clearBattleOutcomeHoldTimer();
    setBattleEndDock(false);
    clearOfflinePvp();
    resetOfflinePvpFlow();
    setBattleSetupKey((key) => key + 1);
    setScreen('offlinePvpList');
  }, [clearBattleOutcomeHoldTimer, clearOfflinePvp, resetOfflinePvpFlow]);

  const handleCancelBattleMatch = useCallback(() => {
    clearBattleOutcomeHoldTimer();
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
    setBattleHubModeScreenOpen(false);
    setScreen('battleHub');
  }, [clearBattleOutcomeHoldTimer, clearHistoryRematch, persistSave]);

  const handleCancelHistoryRematch = useCallback(() => {
    clearBattleOutcomeHoldTimer();
    setBattleEndDock(false);
    clearHistoryRematch();
    resetHistoryRematchFlow();
    setBattleSetupKey((key) => key + 1);
    setScreen('records');
  }, [clearBattleOutcomeHoldTimer, clearHistoryRematch, resetHistoryRematchFlow]);

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

      const layout = normalizeDeckLayout(decksRef.current[deckIndex] ?? []);
      const playerDeck = getDeckCards(layout);

      setIsHistoryRematch(true);
      isHistoryRematchRef.current = true;
      historyRematchEntryRef.current = entry;
      clearOfflinePvp();
      resetOfflinePvpFlow();
      setBattlePlayerDeck(playerDeck);
      battleStartSnapshotRef.current = null;
      setCpuDeck(prepareHistoryOpponentDeck(entry.opponentDeck, playerDeck));
      setCpuOpponent({
        name: entry.opponentName || CPU_OPPONENT_LABEL,
        level: entry.opponentLevel,
      });

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
    [
      clearOfflinePvp,
      historyRematchFlow,
      persistSave,
      resetHistoryRematchFlow,
      resetOfflinePvpFlow,
    ],
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
    const ghost = offlinePvpGhostRef.current;
    if (isOfflinePvpRef.current && ghost) {
      setOfflinePvpFlow({ ghost, phase: 'deckSelect' });
      setIsOfflinePvp(false);
      isOfflinePvpRef.current = false;
      setBattleEndDock(false);
      setScreen('offlinePvpList');
      return;
    }
    requestGoToBattleSetup(lastBattleDeckIndexRef.current);
  }, [requestGoToBattleSetup, requestHistoryRematch]);

  const restartBattleFromEnd = useCallback(() => {
    const ghost = offlinePvpGhostRef.current;
    if (isOfflinePvpRef.current && ghost) {
      startOfflinePvpBattle(lastBattleDeckIndexRef.current);
      return;
    }
    requestGoToBattleSetup(lastBattleDeckIndexRef.current);
  }, [requestGoToBattleSetup, startOfflinePvpBattle]);

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
        syncAndPersistOwnershipAchievements();
      }
    },
    [reportAndPersistMissionEvents, syncAndPersistOwnershipAchievements, updateActiveDeck],
  );

  const updateCard = useCallback(
    (
      updated: Card,
      options?: {
        saveCharges?: EditorSaveCharges;
        nameChanged?: boolean;
        canvasResized?: boolean;
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

      const missionEvents: Array<{ type: MissionEventType; amount?: number }> = [
        { type: 'card_edit_saved' },
      ];
      if (options?.nameChanged) {
        missionEvents.push({ type: 'card_renamed' });
      }
      if (options?.canvasResized) {
        missionEvents.push({ type: 'canvas_resized' });
      }
      if (
        original &&
        !hasCardUserNote(original) &&
        hasCardUserNote(finalCard)
      ) {
        missionEvents.push({ type: 'card_note_saved' });
      }
      reportAndPersistMissionEvents(missionEvents);
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
    syncAndPersistOwnershipAchievements();
  }, [persistSave, reportAndPersistMissionEvents, syncAndPersistOwnershipAchievements]);

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
      reportAndPersistMissionEvents([{ type: 'attribute_selected' }]);
      syncAndPersistOwnershipAchievements();
      return {
        attribute,
        previousBp,
        newBp: updated.bp,
        previousJewels,
        nextJewels: spent.jewels,
      };
    },
    [persistSave, reportAndPersistMissionEvents, syncAndPersistOwnershipAchievements],
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

      reportAndPersistMissionEvents([{ type: 'card_deleted' }]);
      return deleted.outcome;
    },
    [computeCardDeleteOutcome, persistSave, removeCardFromDeck, reportAndPersistMissionEvents],
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

      reportAndPersistMissionEvents([{ type: 'memory_album_saved' }]);
      syncAndPersistOwnershipAchievements();
      return 'ok';
    },
    [persistSave, removeCardFromDeck, reportAndPersistMissionEvents, syncAndPersistOwnershipAchievements],
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

      reportAndPersistMissionEvents([{ type: 'card_deleted' }]);
      return deleted.outcome;
    },
    [computeCardDeleteOutcome, persistSave, reportAndPersistMissionEvents],
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

      const cost = calcReviveCost(target);
      const nextEconomy = spendFreePixels(economyRef.current, cost);
      if (!nextEconomy) return;

      const nextLayout = prevLayout.map((card) =>
        card?.id === id ? applyCardRevive(card) : card,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextLayout);

      persistSave({ decks: nextDecks, economy: nextEconomy });
      setDecks(nextDecks);
      setEconomy(nextEconomy);
      decksRef.current = nextDecks;
      economyRef.current = nextEconomy;
      reportAndPersistMissionEvents([{ type: 'card_revived' }]);
      syncAndPersistOwnershipAchievements();
    },
    [persistSave, reportAndPersistMissionEvents, syncAndPersistOwnershipAchievements],
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
          mode: isOfflinePvpRef.current
            ? ('offlinePvp' as const)
            : ('cpu' as const),
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
          : calcSurvivorPixelsForBattleVictory(
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
        createBattleHistoryEntry(
          outcome,
          {
            playerDeck:
              battleStartSnapshotRef.current?.playerDeck ??
              getDeckCards(prevActiveDeck),
            playerLevel:
              battleStartSnapshotRef.current?.playerLevel ??
              prevUser?.level ??
              1,
          },
          {
            opponentOwnerId: isOfflinePvpRef.current
              ? offlinePvpGhostRef.current?.ownerId
              : isHistoryRematchRef.current
                ? historyRematchEntryRef.current?.opponentOwnerId
                : undefined,
          },
        ),
      );
      const lastBattleIndex =
        battleStartSnapshotRef.current?.deckIndex ?? deckIndex;
      const playerDeck =
        battleStartSnapshotRef.current?.playerDeck ??
        getDeckCards(prevActiveDeck);
      const battleUserLevel = nextUser?.level ?? prevUser?.level ?? 1;
      const battleMissionEvents: Array<{ type: MissionEventType; amount?: number }> =
        [{ type: 'battle_play' }];
      if (outcome.winner === 'player') {
        battleMissionEvents.push({ type: 'battle_win' });
        battleMissionEvents.push(
          isOfflinePvpRef.current
            ? { type: 'offline_pvp_battle_win' }
            : { type: 'cpu_battle_win' },
        );
      }
      let missionResult = applyMissionEvents(
        missionStateRef.current,
        battleMissionEvents,
        new Date(),
        battleUserLevel,
      );
      if (outcome.winner === 'player') {
        const deckWinResult = reportPermanentDeckWinAchievements(
          missionResult.state,
          playerDeck,
          battleUserLevel,
        );
        missionResult = mergeMissionEventResults(missionResult, deckWinResult);
      }
      const ownershipResult = syncPermanentOwnershipAchievements(
        missionResult.state,
        nextDecks,
        memoryAlbumRef.current,
        battleUserLevel,
      );
      missionResult = mergeMissionEventResults(missionResult, ownershipResult);
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

  const applyOnlinePvpPxSettlement = useCallback(
    (room: OnlineBattleRoom, playerWon: boolean) => {
      if (room.status !== 'rematch_wait' || room.lastTransferPx == null) return;
      const transfer = room.lastTransferPx;
      const key = `${room.id}:${room.battleRevision}:${transfer}`;
      if (onlinePxSettledKeyRef.current === key) return;
      onlinePxSettledKeyRef.current = key;

      const { nextWalletPx } = applyOnlinePvpWalletTransfer(
        economyRef.current.freePixels,
        playerWon,
        transfer,
      );
      if (nextWalletPx !== economyRef.current.freePixels) {
        const nextEconomy = setFreePixels(economyRef.current, nextWalletPx);
        economyRef.current = nextEconomy;
        setEconomy(nextEconomy);
        persistSave({ economy: nextEconomy });
      }

      const role = onlinePvpRoleRef.current;
      if (role) {
        void syncOnlineWalletBalance(room.id, role, nextWalletPx).then((synced) => {
          if (!synced.ok) return;
          if (shouldApplyOnlineRoomUpdate(onlinePvpRoomRef.current, synced.data)) {
            setOnlinePvpRoom(synced.data);
            onlinePvpRoomRef.current = synced.data;
          }
        });
      }
    },
    [persistSave],
  );

  const finalizeOnlineBattleOutcome = useCallback(
    (outcome: BattleOutcome) => {
      const prevUser = userRef.current;
      const onlineWinDelta = outcome.winner === 'player' ? 1 : 0;
      const onlineLossDelta = outcome.winner === 'cpu' ? 1 : 0;
      const nextUser = prevUser
        ? {
            ...prevUser,
            battleWins: prevUser.battleWins + onlineWinDelta,
            battleLosses: prevUser.battleLosses + onlineLossDelta,
            onlinePvpBattleWins:
              prevUser.onlinePvpBattleWins + onlineWinDelta,
            onlinePvpBattleLosses:
              prevUser.onlinePvpBattleLosses + onlineLossDelta,
          }
        : null;
      const prevDecks = decksRef.current;
      const deckIndex = activeDeckIndexRef.current;
      const prevActiveDeck = normalizeDeckLayout(prevDecks[deckIndex] ?? []);
      const nextActiveDeck = applyCardSurvivalRecords(
        prevActiveDeck,
        outcome.playerCardIds,
        outcome.defeatedPlayerCardIds,
      );
      const nextDecks = updateDeckAtIndex(prevDecks, deckIndex, nextActiveDeck);
      const historyRoom = onlinePvpRoomRef.current;
      const historyRole = onlinePvpRoleRef.current;
      const opponentOwnerId =
        historyRoom && historyRole
          ? historyRole === 'host'
            ? historyRoom.guestUserId
            : historyRoom.hostUserId
          : undefined;
      const nextHistory = appendBattleHistory(
        battleHistoryRef.current,
        createBattleHistoryEntry(
          outcome,
          {
            playerDeck:
              battleStartSnapshotRef.current?.playerDeck ??
              getDeckCards(prevActiveDeck),
            playerLevel:
              battleStartSnapshotRef.current?.playerLevel ??
              prevUser?.level ??
              1,
          },
          { opponentOwnerId },
        ),
      );
      const battleMissionEvents: Array<{ type: MissionEventType; amount?: number }> =
        [{ type: 'battle_play' }];
      if (outcome.winner === 'player') {
        battleMissionEvents.push({ type: 'battle_win' });
      }
      let missionResult = applyMissionEvents(
        missionStateRef.current,
        battleMissionEvents,
        new Date(),
        prevUser?.level ?? 1,
      );
      const ownershipResult = syncPermanentOwnershipAchievements(
        missionResult.state,
        nextDecks,
        memoryAlbumRef.current,
        prevUser?.level ?? 1,
      );
      missionResult = mergeMissionEventResults(missionResult, ownershipResult);
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
        ...(nextUser ? { user: nextUser } : {}),
        decks: nextDecks,
        battleHistory: nextHistory,
        missionState: nextMissionState,
      });
      if (nextUser) {
        userRef.current = nextUser;
        setUser(nextUser);
      }
      decksRef.current = nextDecks;
      setDecks(nextDecks);
      setBattleHistory(nextHistory);
      battleStartSnapshotRef.current = null;

      const room = onlinePvpRoomRef.current;
      if (room) {
        void finalizeOnlineBattleIfEnded(room).then((result) => {
          if (!result.ok) return;
          if (shouldApplyOnlineRoomUpdate(onlinePvpRoomRef.current, result.data)) {
            setOnlinePvpRoom(result.data);
            onlinePvpRoomRef.current = result.data;
          }
          applyOnlinePvpPxSettlement(result.data, outcome.winner === 'player');
        });
      }
    },
    [applyOnlinePvpPxSettlement, persistSave],
  );

  const finalizeHistoryRematchOutcome = useCallback(
    (
      outcome: BattleOutcome,
      options: { doubleRewards?: boolean } = {},
    ) => {
      const battleMissionEvents: Array<{ type: MissionEventType; amount?: number }> =
        [{ type: 'battle_play' }, { type: 'history_rematch_play' }];
      if (outcome.winner === 'player') {
        battleMissionEvents.push(
          { type: 'battle_win' },
          { type: 'history_rematch_win' },
        );
      }

      let nextEconomy = economyRef.current;
      const doubleRewards =
        options.doubleRewards === true ||
        hasPremiumAlwaysDouble(subscriptionRef.current);
      const survivorCount = countBattleSurvivors(
        outcome.playerCardIds,
        outcome.defeatedPlayerCardIds,
      );
      const pixelTotal = calcHistoryRematchRewardPixels(
        survivorCount,
        outcome.winner,
        doubleRewards,
      );
      if (pixelTotal > 0) {
        nextEconomy = addFreePixels(economyRef.current, pixelTotal);
        economyRef.current = nextEconomy;
        setEconomy(nextEconomy);
      }

      reportAndPersistMissionEvents(battleMissionEvents, {
        economy: nextEconomy,
        adState: adStateRef.current,
      });
    },
    [reportAndPersistMissionEvents],
  );

  const handleHistoryRematchRewardClaim = useCallback(
    (options?: { doubleRewards?: boolean }) => {
      const outcome = pendingHistoryRematchOutcome;
      if (!outcome) return;
      setPendingHistoryRematchOutcome(null);
      setHistoryRematchVictoryDoublePending(false);
      setHistoryRematchDoubleRewardsFromAd(false);
      finalizeHistoryRematchOutcome(outcome, {
        doubleRewards:
          options?.doubleRewards === true ||
          historyRematchDoubleRewardsFromAd ||
          hasPremiumAlwaysDouble(subscriptionRef.current),
      });
    },
    [
      finalizeHistoryRematchOutcome,
      historyRematchDoubleRewardsFromAd,
      pendingHistoryRematchOutcome,
    ],
  );

  const handleRequestHistoryRematchVictoryDoubleAd = useCallback(() => {
    setHistoryRematchVictoryDoublePending(true);
  }, []);

  const handleBattleOutcome = useCallback(
    (outcome: BattleOutcome) => {
      if (isOnlinePvpRef.current) {
        finalizeOnlineBattleOutcome(outcome);
        return;
      }
      if (isHistoryRematchRef.current) {
        const survivorCount = countBattleSurvivors(
          outcome.playerCardIds,
          outcome.defeatedPlayerCardIds,
        );
        const pixelTotal = calcHistoryRematchRewardPixels(
          survivorCount,
          outcome.winner,
          false,
        );
        if (pixelTotal > 0) {
          scheduleBattleOutcomeModal(() => {
            setHistoryRematchDoubleRewardsFromAd(false);
            setPendingHistoryRematchOutcome(outcome);
          });
          return;
        }
        finalizeHistoryRematchOutcome(outcome);
        return;
      }
      if (
        outcome.winner === 'player' &&
        outcome.defeatedCpuCards.length > 0
      ) {
        scheduleBattleOutcomeModal(() => {
          setGraveyardDoubleRewardsFromAd(false);
          setPendingGraveyardOutcome(outcome);
        });
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
        scheduleBattleOutcomeModal(() => setPendingLostRouletteOutcome(outcome));
        return;
      }
      finalizeBattleOutcome(outcome, {});
    },
    [
      finalizeBattleOutcome,
      finalizeHistoryRematchOutcome,
      finalizeOnlineBattleOutcome,
      scheduleBattleOutcomeModal,
    ],
  );

  const handleGraveyardPick = useCallback(
    (card: Card, options?: { doubleRewards?: boolean }) => {
      const outcome = pendingGraveyardOutcome;
      if (!outcome) return;
      setPendingGraveyardOutcome(null);
      setGraveyardVictoryDoubleCard(null);
      setGraveyardDoubleRewardsFromAd(false);
      const doubleVictoryRewards =
        options?.doubleRewards === true ||
        graveyardDoubleRewardsFromAd ||
        hasPremiumAlwaysDouble(subscriptionRef.current);
      finalizeBattleOutcome(outcome, {
        graveyardCard: card,
        doubleVictoryRewards,
      });
    },
    [
      finalizeBattleOutcome,
      graveyardDoubleRewardsFromAd,
      pendingGraveyardOutcome,
    ],
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
      if (
        isSupabaseConfigured() &&
        publishedDeckSlotsRef.current.some((published) => published)
      ) {
        void (async () => {
          const result = await republishOwnedPublishedDecks({
            publishedSlots: publishedDeckSlotsRef.current,
            remoteIds: publishedDeckRemoteIdsRef.current,
            decks: nextDecks,
            deckNames: deckNamesRef.current,
            user: nextUser,
            unlockedDeckCount: unlockedDeckCountRef.current,
          });
          if (!result.changed) return;
          publishedDeckSlotsRef.current = result.slots;
          publishedDeckRemoteIdsRef.current = result.remoteIds;
          setPublishedDeckSlots(result.slots);
          setPublishedDeckRemoteIds(result.remoteIds);
          persistSave({
            publishedDeckSlots: result.slots,
            publishedDeckRemoteIds: result.remoteIds,
          });
        })();
      }
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
      if (!canRenameDeck(subscriptionRef.current)) return;
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

  const showHistoryRematchVictoryDoubleAd = showGraveyardVictoryDoubleAd;

  const graveyardAlwaysDoubleRewards = useMemo(
    () => hasPremiumAlwaysDouble(subscription),
    [subscription],
  );

  const historyRematchAlwaysDoubleRewards = graveyardAlwaysDoubleRewards;

  const subscriptionPlanLabel = useMemo(
    () => formatSubscriptionPlanLabel(subscription),
    [subscription],
  );

  const editorCanEditCardUserNote = useMemo(
    () => canEditCardUserNote(subscription),
    [subscription],
  );

  const editorCanRenameCardForFree = useMemo(
    () => canRenameCardForFree(subscription),
    [subscription],
  );

  const deckCanRename = useMemo(
    () => canRenameDeck(subscription),
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
  const isOfflinePvpDeckSelect = offlinePvpFlow?.phase === 'deckSelect';
  const hasOfflinePvpBattleDeck = useMemo(() => {
    for (let i = 0; i < unlockedDeckCount; i++) {
      if (isDeckBattleReady(normalizeDeckLayout(decks[i] ?? []))) return true;
    }
    return false;
  }, [decks, unlockedDeckCount]);
  const offlinePvpUnlocked = isOfflinePvpUnlockedAtUserLevel(user?.level ?? 1);
  const onlinePvpUnlocked = isOnlinePvpUnlockedAtUserLevel(user?.level ?? 1);

  useEffect(() => {
    if (!isOnlinePvp || !onlinePvpRoom?.id) return;
    return subscribeOnlineBattleRoom(onlinePvpRoom.id, (room) => {
      const current = onlinePvpRoomRef.current;
      if (!shouldApplyOnlineRoomUpdate(current, room)) return;
      setOnlinePvpRoom(room);
      onlinePvpRoomRef.current = room;
      const role = onlinePvpRoleRef.current;
      if (
        role &&
        (room.status === 'setup' ||
          room.status === 'battle' ||
          room.status === 'rematch_wait') &&
        room.hostDeck &&
        room.guestDeck
      ) {
        const myDeck = role === 'host' ? room.hostDeck : room.guestDeck;
        const oppDeck = role === 'host' ? room.guestDeck : room.hostDeck;
        const deckKey = `${myDeck.map((c) => `${c.id}:${c.bp}`).join(',')}|${oppDeck.map((c) => `${c.id}:${c.bp}`).join(',')}`;
        const mountCtx = onlineBattleSetupMountRef.current;
        if (mountCtx?.roomId !== room.id || mountCtx?.deckKey !== deckKey) {
          setBattlePlayerDeck(structuredClone(myDeck));
          setCpuDeck(structuredClone(oppDeck));
          onlineBattleSetupMountRef.current = {
            roomId: room.id,
            status: room.status,
            deckKey,
          };
        }
        setCpuOpponent(opponentIdentity(room, role));
      }
      if (room.status === 'rematch_wait' && room.lastTransferPx != null && role && room.battleState) {
        const hostResult = getBattleResult(room.battleState);
        if (hostResult) {
          const playerWon =
            role === 'host' ? hostResult === 'player' : hostResult === 'cpu';
          applyOnlinePvpPxSettlement(room, playerWon);
        }
      }
      if (room.status === 'deck_select') {
        onlinePxSettledKeyRef.current = null;
      }
      if (
        room.status === 'closed' &&
        room.closedByRole &&
        role &&
        room.closedByRole !== role
      ) {
        // バトル終了後は終了モーダル側で案内する
        if (!battleEndDock) {
          setOnlinePvpOpponentLeftOpen(true);
        }
      }
      if (screen === 'battleSetup' && shouldReturnToOnlineDeckSelect(room)) {
        setBattleEndDock(false);
        setScreen('onlinePvp');
      }
    });
  }, [
    applyOnlinePvpPxSettlement,
    battleEndDock,
    isOnlinePvp,
    onlinePvpRoom?.id,
    screen,
  ]);

  const syncOnlinePvpRoom = useCallback((room: OnlineBattleRoom) => {
    const current = onlinePvpRoomRef.current;
    if (!shouldApplyOnlineRoomUpdate(current, room)) return;
    setOnlinePvpRoom(room);
    onlinePvpRoomRef.current = room;
  }, []);

  const handleOnlineSubmitSetup = useCallback(
    (formation: Parameters<typeof submitOnlineSetup>[2]) => {
      const room = onlinePvpRoomRef.current;
      const role = onlinePvpRoleRef.current;
      if (!room || !role) return;
      void submitOnlineSetup(room.id, role, formation);
    },
    [],
  );

  const handleOnlineRematchReady = useCallback(() => {
    const room = onlinePvpRoomRef.current;
    const role = onlinePvpRoleRef.current;
    if (!room || !role) return;
    if (!canContinueOnlinePvpSession(economyRef.current.freePixels)) {
      void leaveOnlinePvpRoom();
      return;
    }
    void submitOnlineRematchReady(room.id, role).then((result) => {
      if (result.ok) {
        if (shouldApplyOnlineRoomUpdate(onlinePvpRoomRef.current, result.data)) {
          setOnlinePvpRoom(result.data);
          onlinePvpRoomRef.current = result.data;
        }
        if (result.data.status === 'deck_select') {
          setBattleEndDock(false);
          setScreen('onlinePvp');
        }
      }
    });
  }, [leaveOnlinePvpRoom]);

  const onlinePvpSetupProps =
    isOnlinePvp && onlinePvpRoom && onlinePvpRole
      ? {
          role: onlinePvpRole,
          room: onlinePvpRoom,
          roomCode: onlinePvpRoom.code,
          walletPx: economy.freePixels,
          canRematch: canContinueOnlinePvpSession(economy.freePixels),
          onSubmitSetup: handleOnlineSubmitSetup,
          onRematchReady: handleOnlineRematchReady,
          onLeaveRoom: () => {
            const room = onlinePvpRoomRef.current;
            const role = onlinePvpRoleRef.current;
            const opponentAlreadyLeft =
              room?.status === 'closed' &&
              room.closedByRole != null &&
              role != null &&
              room.closedByRole !== role;
            void leaveOnlinePvpRoom({ skipClose: opponentAlreadyLeft });
          },
          onRoomSync: syncOnlinePvpRoom,
        }
      : undefined;

  /** 一覧の「戦力補正あり」表示用。出撃デッキ確定前の参考戦力（直近バトル or 先頭の戦闘可能デッキ） */
  const viewerReferenceDeckPower = useMemo(() => {
    const candidates = [lastBattleDeckIndex, activeDeckIndex];
    for (const index of candidates) {
      if (index < 0 || index >= unlockedDeckCount) continue;
      const layout = normalizeDeckLayout(decks[index] ?? []);
      if (isDeckBattleReady(layout)) {
        return computeDeckPower(getDeckCards(layout));
      }
    }
    for (let i = 0; i < unlockedDeckCount; i++) {
      const layout = normalizeDeckLayout(decks[i] ?? []);
      if (isDeckBattleReady(layout)) {
        return computeDeckPower(getDeckCards(layout));
      }
    }
    return null;
  }, [activeDeckIndex, decks, lastBattleDeckIndex, unlockedDeckCount]);

  const showProfileBar =
    isProfileComplete(user) &&
    (isTabId(screen) ||
      screen === 'memoryAlbum' ||
      screen === 'records' ||
      screen === 'offlinePvpList' ||
      screen === 'onlinePvp' ||
      isHistoryRematchDeckSelect ||
      isOfflinePvpDeckSelect);
  const showDock =
    (isDockVisible(screen) &&
      !(screen === 'battleHub' && battleHubModeScreenOpen)) ||
    (screen === 'battleSetup' && battleEndDock) ||
    isHistoryRematchDeckSelect;
  const activeTab: TabId =
    isHistoryRematchDeckSelect ||
    isOfflinePvpDeckSelect ||
    screen === 'offlinePvpList' ||
    screen === 'records'
      ? 'battleHub'
      : screen === 'battleSetup' && battleEndDock
        ? 'battleHub'
        : isTabId(screen)
          ? screen
          : 'deck';

  const selectTab = useCallback(
    (tab: TabId) => {
      clearBattleOutcomeHoldTimer();
      setBattleEndDock(false);
      clearHistoryRematch();
      resetHistoryRematchFlow();
      clearOfflinePvp();
      resetOfflinePvpFlow();
      clearOnlinePvp();
      setBattleHubModeScreenOpen(false);
      if (tab !== 'deck') {
        setDeckReorderMode(false);
      }
      if (tab === 'shop') {
        setShopInitialTab('jewels');
      }
      setScreen(tab);
    },
    [
      clearBattleOutcomeHoldTimer,
      clearHistoryRematch,
      clearOfflinePvp,
      clearOnlinePvp,
      resetHistoryRematchFlow,
      resetOfflinePvpFlow,
    ],
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
      const userLevel = userRef.current?.level ?? 1;
      const result = claimMission(
        missionStateRef.current,
        economyRef.current,
        inventoryRef.current,
        missionId,
        new Date(),
        userLevel,
      );
      if (!result) return;
      missionStateRef.current = result.state;
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

  const handleClaimCompletionBonus = useCallback(
    (category: CompletionBonusCategory) => {
      const userLevel = userRef.current?.level ?? 1;
      const result = claimCompletionBonus(
        missionStateRef.current,
        economyRef.current,
        inventoryRef.current,
        category,
        new Date(),
        userLevel,
      );
      if (!result) return;
      missionStateRef.current = result.state;
      economyRef.current = result.economy;
      inventoryRef.current = result.inventory;
      setMissionState(result.state);
      setEconomy(result.economy);
      setInventory(result.inventory);
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
      const userLevel = userRef.current?.level ?? 1;
      const result = claimMissionsInCategory(
        missionStateRef.current,
        economyRef.current,
        inventoryRef.current,
        category,
        new Date(),
        userLevel,
      );
      if (result.missionIds.length === 0) return null;
      missionStateRef.current = result.state;
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
      const mission = getMissionById(missionId, missionStateRef.current);
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

  const missionUnclaimedCount = countUnclaimedMissions(
    missionState,
    user?.level ?? 1,
  );

  const openProfile = useCallback(() => {
    remoteProfileRequestRef.current += 1;
    setRemoteProfileView(null);
    profileReturnScreenRef.current = screen;
    setScreen('profile');
  }, [screen]);

  const closeProfile = useCallback(() => {
    remoteProfileRequestRef.current += 1;
    setRemoteProfileView(null);
    setScreen(profileReturnScreenRef.current);
  }, []);

  const loadRemoteProfile = useCallback(async (source: RemoteProfileSource) => {
    const requestId = ++remoteProfileRequestRef.current;
    const snapshot = createRemoteProfileSnapshot(source, 'loading');
    setRemoteProfileView(snapshot);

    if (!source.ownerId) {
      setRemoteProfileView(createRemoteProfileSnapshot(source, 'snapshot'));
      return;
    }

    try {
      const [profileResult, decksResult] = await Promise.all([
        getPublicProfileByOwnerId(source.ownerId),
        listPublicGhostDecksByOwnerId(source.ownerId),
      ]);
      if (remoteProfileRequestRef.current !== requestId) return;

      const publicProfile =
        profileResult.ok && profileResult.profile
          ? profileResult.profile
          : null;
      const publishedDecks = decksResult.ok
        ? decksResult.decks.map((deck) => ({
            slotIndex: deck.slotIndex,
            name: deck.deckName,
            cards: deck.deck,
            ghostId: deck.id,
            ownerId: deck.ownerId,
          }))
        : snapshot.publishedDecks;
      setRemoteProfileView({
        source,
        ownerId: source.ownerId,
        user: publicProfile ?? snapshot.user,
        publishedDecks,
        status:
          publicProfile != null && decksResult.ok ? 'loaded' : 'error',
      });
    } catch (error) {
      if (remoteProfileRequestRef.current !== requestId) return;
      console.warn('[publicProfile] failed to load remote profile', error);
      setRemoteProfileView(createRemoteProfileSnapshot(source, 'error'));
    }
  }, []);

  const openRemoteProfile = useCallback(
    (ghost: PublicGhostDeck) => {
      profileReturnScreenRef.current = screen;
      setScreen('profile');
      void loadRemoteProfile(createRemoteProfileSourceFromGhost(ghost));
    },
    [loadRemoteProfile, screen],
  );

  const openHistoryOpponentProfile = useCallback(
    (entry: BattleHistoryEntry) => {
      profileReturnScreenRef.current = screen;
      setScreen('profile');
      void loadRemoteProfile(createRemoteProfileSourceFromHistory(entry));
    },
    [loadRemoteProfile, screen],
  );

  const saveAvatar = useCallback(
    (avatar: NonNullable<UserProfile['avatar']>) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      const nextUser = { ...currentUser, avatar };
      userRef.current = nextUser;
      setUser(nextUser);
      persistSave({ user: nextUser });
      setScreen('avatarDetail');
    },
    [persistSave],
  );

  const deleteAvatar = useCallback(() => {
    const currentUser = userRef.current;
    if (!currentUser?.avatar) return;
    const nextUser = { ...currentUser };
    delete nextUser.avatar;
    userRef.current = nextUser;
    setUser(nextUser);
    persistSave({ user: nextUser });
  }, [persistSave]);

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
            subscription={subscription}
            freePixels={economy.freePixels}
            jewels={economy.jewels}
            onOpenProfile={openProfile}
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
            canRenameDeck={deckCanRename}
            onOpenShopSubscription={openShopSubscriptionTab}
            onEquipTalisman={equipTalismanOnCard}
            onUnequipTalisman={unequipTalismanOnCard}
            showLostCardDeckNotice={shouldShowLostCardDeckNoticeModal(adState)}
            onDismissLostCardDeckNoticeForToday={handleDismissLostCardDeckNoticeForToday}
            skipsCreativeAd={skipsCreativeAd(subscription)}
            onBattleGuideOpen={handleBattleGuideOpen}
            deckPublished={publishedDeckSlots[activeDeckIndex] === true}
            publishBusy={publishBusy}
            canPublishDeck={canPublishDeck(activeDeck)}
            publishAvailable={isSupabaseConfigured()}
            offlinePvpUnlocked={offlinePvpUnlocked}
            publishError={publishError}
            onToggleDeckPublish={handleToggleDeckPublish}
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
            onClaimCompletionBonus={handleClaimCompletionBonus}
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
            onOpenOfflinePvp={openOfflinePvpList}
            onOpenOnlinePvp={openOnlinePvp}
            onlinePvpUnlocked={onlinePvpUnlocked}
            supabaseConfigured={isSupabaseConfigured()}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
            onOpenRecords={openRecords}
            onModeScreenChange={setBattleHubModeScreenOpen}
          />
        )}
        {screen === 'offlinePvpList' && !isOfflinePvpDeckSelect && (
          <OfflinePvpDeckListScreen
            viewerLevel={user?.level ?? 1}
            viewerDeckPower={viewerReferenceDeckPower}
            excludeOwnerId={supabaseOwnerId}
            canBattle={hasOfflinePvpBattleDeck}
            onBack={closeOfflinePvpList}
            onOpenProfile={openRemoteProfile}
            onChallenge={startOfflinePvpDeckSelect}
          />
        )}
        {screen === 'onlinePvp' && isProfileComplete(user) && (
          <OnlinePvpScreen
            userName={user.username}
            userLevel={user.level}
            walletPx={economy.freePixels}
            userId={supabaseOwnerId}
            supabaseConfigured={isSupabaseConfigured()}
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            resumeRoom={onlinePvpRoom}
            resumeRole={onlinePvpRole}
            onBack={() => void leaveOnlinePvpRoom()}
            onRoomUpdated={handleOnlineRoomUpdated}
            onOpponentLeft={() => setOnlinePvpOpponentLeftOpen(true)}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
          />
        )}
        {isOfflinePvpDeckSelect ? (
          <BattleDeckSelectScreen
            decks={decks}
            deckNames={deckNames}
            unlockedDeckCount={unlockedDeckCount}
            lastBattleDeckIndex={lastBattleDeckIndex}
            backLabel="公開デッキ一覧に戻る"
            battleMode="offlinePvp"
            showDeckSelectSubheader
            startButtonInBottomNav
            onStartBattle={startOfflinePvpBattle}
            onBack={resetOfflinePvpFlow}
            onGoToMyDeck={goToMyDeckWithCard}
            onReorderDeckAt={reorderDeckAt}
            onMoveCardBetweenDecks={moveCardBetweenDecksInHub}
          />
        ) : isHistoryRematchDeckSelect ? (
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
            onOpenOpponentProfile={openHistoryOpponentProfile}
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
            onCancelSubscribe={handleCancelSubscribe}
            onDismissPurchaseMessage={() => setShopPurchaseMessage(null)}
          />
        )}
        {screen === 'inventory' && (
          <InventoryScreen
            inventory={inventory}
            equippedTalismanCount={equippedTalismanCount}
          />
        )}
        {screen === 'profile' && remoteProfileView && (
          <ProfileScreen
            user={remoteProfileView.user}
            publishedDecks={remoteProfileView.publishedDecks}
            loading={remoteProfileView.status === 'loading'}
            loadError={remoteProfileView.status === 'error'}
            onRetry={
              remoteProfileView.ownerId
                ? () => void loadRemoteProfile(remoteProfileView.source)
                : undefined
            }
            onBack={closeProfile}
            onOpenAvatar={() => setScreen('avatarDetail')}
            viewerDeckPower={viewerReferenceDeckPower}
            canBattle={hasOfflinePvpBattleDeck}
            offlinePvpUnlocked={offlinePvpUnlocked}
            ownerId={remoteProfileView.ownerId}
            onChallengeDeck={startOfflinePvpDeckSelect}
          />
        )}
        {screen === 'profile' && !remoteProfileView && user && (
          <ProfileScreen
            user={user}
            subscription={subscription}
            publishedDecks={profilePublishedDecks}
            onBack={closeProfile}
            onOpenAvatar={() => setScreen('avatarDetail')}
            onCommentChange={handleProfileCommentChange}
            viewerDeckPower={viewerReferenceDeckPower}
            canBattle={false}
            offlinePvpUnlocked={offlinePvpUnlocked}
          />
        )}
        {screen === 'avatarDetail' && remoteProfileView && (
          <AvatarDetailScreen
            user={remoteProfileView.user}
            onBack={() => setScreen('profile')}
          />
        )}
        {screen === 'avatarDetail' && !remoteProfileView && user && (
          <AvatarDetailScreen
            user={user}
            onBack={() => setScreen('profile')}
            onEdit={() => setScreen('avatarEditor')}
            onDelete={deleteAvatar}
          />
        )}
        {screen === 'avatarEditor' && user && (
          <AvatarEditorScreen
            avatar={user.avatar}
            onBack={() => setScreen('avatarDetail')}
            onSave={saveAvatar}
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
            mockLifetimeSpendYen={getMockLifetimeSpendYen(shopPurchase)}
            mockAdsWatchedTotal={getMockAdsWatchedTotal(adState)}
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
            onCloudSaveUpload={handleCloudSaveUpload}
            onCloudRestoreDownload={handleCloudRestoreDownload}
            onAccountDeleted={handleAccountDeleted}
            onUsernameChange={handleUsernameChange}
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
            canRenameCardForFree={editorCanRenameCardForFree}
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
        {screen === 'battleSetup' &&
          !isHistoryRematchDeckSelect &&
          !isOfflinePvpDeckSelect && (
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
            enableOpponentMatching={!isHistoryRematch && !isOfflinePvp && !isOnlinePvp}
            onCancelMatch={
              isOnlinePvp
                ? () => void leaveOnlinePvpRoom()
                : isHistoryRematch
                  ? handleCancelHistoryRematch
                  : isOfflinePvp
                    ? handleCancelOfflinePvpMatch
                    : handleCancelBattleMatch
            }
            cancelMatchDisabled={
              isHistoryRematch || isOfflinePvp || isOnlinePvp
                ? false
                : economy.freePixels < BATTLE_MATCH_CANCEL_COST
            }
            cancelMatchShowsCost={!isHistoryRematch && !isOfflinePvp && !isOnlinePvp}
            cancelMatchCostPx={BATTLE_MATCH_CANCEL_COST}
            onFinish={handleBattleOutcome}
            onNewBattle={
              isHistoryRematch ? rematchSameOpponent : restartBattleFromEnd
            }
            newBattleDisabled={battleEndNewBattleDisabled}
            onBattleEndedChange={handleBattleEndedChange}
            onBattleLogViewed={handleBattleLogViewed}
            onlinePvp={onlinePvpSetupProps}
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
            recordMockAdWatchedAndPersist();
            setBattleStartPendingAd((pending) => {
              if (pending?.kind === 'normal') {
                goToBattleSetup(pending.deckIndex);
              } else if (pending?.kind === 'historyRematch') {
                executeHistoryRematchBattle(pending.deckIndex);
              } else if (pending?.kind === 'offlinePvp') {
                executeOfflinePvpBattle(pending.deckIndex);
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
            recordMockAdWatchedAndPersist();
            setGraveyardVictoryDoubleCard(null);
            setGraveyardDoubleRewardsFromAd(true);
          }}
          onCancel={() => setGraveyardVictoryDoubleCard(null)}
        />
      )}
      {historyRematchVictoryDoublePending && (
        <MockRewardAdModal
          title="報酬2倍のための広告視聴"
          message="広告視聴後、このバトルのコイン報酬が2倍になります（モック）"
          onComplete={() => {
            recordMockAdWatchedAndPersist();
            setHistoryRematchVictoryDoublePending(false);
            setHistoryRematchDoubleRewardsFromAd(true);
          }}
          onCancel={() => setHistoryRematchVictoryDoublePending(false)}
        />
      )}
      {cardEditPendingAd != null && (
        <MockRewardAdModal
          title="編集のための広告視聴"
          message="広告視聴後、カード編集画面へ進みます（モック）"
          onComplete={() => {
            recordMockAdWatchedAndPersist();
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
          doubleRewardsFromAd={graveyardDoubleRewardsFromAd}
          onPick={handleGraveyardPick}
          onRequestVictoryDoubleAd={handleRequestGraveyardVictoryDoubleAd}
        />
      )}
      {pendingHistoryRematchOutcome && (
        <HistoryRematchRewardModal
          survivorCards={pendingHistoryRematchOutcome.survivorPlayerCards}
          pixelAmount={calcHistoryRematchRewardPixels(
            countBattleSurvivors(
              pendingHistoryRematchOutcome.playerCardIds,
              pendingHistoryRematchOutcome.defeatedPlayerCardIds,
            ),
            pendingHistoryRematchOutcome.winner,
            false,
          )}
          showVictoryDoubleAd={showHistoryRematchVictoryDoubleAd}
          alwaysDoubleRewards={historyRematchAlwaysDoubleRewards}
          doubleRewardsFromAd={historyRematchDoubleRewardsFromAd}
          onClaim={handleHistoryRematchRewardClaim}
          onRequestVictoryDoubleAd={handleRequestHistoryRematchVictoryDoubleAd}
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
      <OnlinePvpOpponentLeftModal
        open={onlinePvpOpponentLeftOpen}
        onAcknowledge={() => void leaveOnlinePvpRoom({ skipClose: true })}
      />
    </div>
  );
}

export default App;
