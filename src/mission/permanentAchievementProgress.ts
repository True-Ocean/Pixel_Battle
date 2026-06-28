import {
  buildPermanentCounterMission,
  buildPermanentGoalsUpTo,
  getPermanentGoalStep,
  getPermanentTierCap,
} from '../config/permanentMissions';
import {
  getRarityForDeckWinCounterPrefix,
  getRarityForOwnershipCounterPrefix,
  PERMANENT_RARITY_COUNTER_SPECS,
} from '../config/permanentRarityCounters';
import { getActivePermanentAchievementMissions } from '../config/permanentAchievements';
import type { Card, DeckLayout, MemoryAlbumState } from '../types';
import {
  collectOwnedAttributes,
  countOwnedRarity,
  countRarityInDeck,
  deckContainsAttribute,
} from './attributeCollection';
import type {
  MissionDefinition,
  MissionEventResult,
  MissionProgressEntry,
  MissionState,
} from './types';

function emptyEntry(): MissionProgressEntry {
  return { progress: 0 };
}

function getEntry(state: MissionState, missionId: string): MissionProgressEntry {
  return state.entries[missionId] ?? emptyEntry();
}

function isAchievementProgressable(
  mission: MissionDefinition,
  entry: MissionProgressEntry,
): boolean {
  if (entry.claimedAt != null) return false;
  if (entry.completedAt != null) return entry.claimedAt == null;
  return true;
}

function isPermanentCounterProgressable(
  entry: MissionProgressEntry,
): boolean {
  if (entry.claimedAt != null) return false;
  if (entry.completedAt != null) return entry.claimedAt == null;
  return true;
}

function completeAchievementIfMatched(
  state: MissionState,
  mission: MissionDefinition,
  matched: boolean,
  date: Date,
  newlyCompleted: MissionDefinition[],
): MissionState {
  if (!matched) return state;

  const entry = getEntry(state, mission.id);
  if (!isAchievementProgressable(mission, entry)) return state;
  if (entry.completedAt != null) return state;

  newlyCompleted.push(mission);
  return {
    ...state,
    entries: {
      ...state.entries,
      [mission.id]: {
        progress: mission.goal,
        completedAt: date.toISOString(),
        ...(entry.claimedAt ? { claimedAt: entry.claimedAt } : {}),
      },
    },
  };
}

function syncPermanentRarityOwnershipCounters(
  state: MissionState,
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
  date: Date,
  newlyCompleted: MissionDefinition[],
): MissionState {
  let next = state;

  for (const spec of PERMANENT_RARITY_COUNTER_SPECS) {
    if (spec.eventType !== 'rarity_owned') continue;

    const rarity = getRarityForOwnershipCounterPrefix(spec.idPrefix);
    if (!rarity) continue;

    const ownedCount = countOwnedRarity(decks, album, rarity);
    const goalStep = getPermanentGoalStep(spec);
    const tierCap = getPermanentTierCap(state, spec.idPrefix);

    for (const goal of buildPermanentGoalsUpTo(tierCap, goalStep)) {
      const mission = buildPermanentCounterMission(spec, goal);
      const entry = getEntry(next, mission.id);
      if (!isPermanentCounterProgressable(entry)) continue;

      const progress = Math.min(goal, ownedCount);
      const completedAt =
        progress >= goal && entry.completedAt == null
          ? date.toISOString()
          : entry.completedAt;

      if (progress === entry.progress && completedAt === entry.completedAt) {
        continue;
      }

      if (completedAt && entry.completedAt == null) {
        newlyCompleted.push(mission);
      }

      next = {
        ...next,
        entries: {
          ...next.entries,
          [mission.id]: {
            progress,
            ...(completedAt ? { completedAt } : {}),
            ...(entry.claimedAt ? { claimedAt: entry.claimedAt } : {}),
          },
        },
      };
    }
  }

  return next;
}

function reportPermanentRarityDeckWinCounters(
  state: MissionState,
  playerDeck: readonly Card[],
  date: Date,
  newlyCompleted: MissionDefinition[],
): MissionState {
  let next = state;

  for (const spec of PERMANENT_RARITY_COUNTER_SPECS) {
    if (spec.eventType !== 'deck_win_with_rarity') continue;

    const rarity = getRarityForDeckWinCounterPrefix(spec.idPrefix);
    if (!rarity) continue;

    const deckCount = countRarityInDeck(playerDeck, rarity);
    if (deckCount <= 0) continue;

    const goalStep = getPermanentGoalStep(spec);
    const tierCap = getPermanentTierCap(state, spec.idPrefix);

    for (const goal of buildPermanentGoalsUpTo(tierCap, goalStep)) {
      if (goal > deckCount) continue;

      const mission = buildPermanentCounterMission(spec, goal);
      const entry = getEntry(next, mission.id);
      if (!isPermanentCounterProgressable(entry)) continue;
      if (entry.completedAt != null) continue;

      newlyCompleted.push(mission);
      next = {
        ...next,
        entries: {
          ...next.entries,
          [mission.id]: {
            progress: goal,
            completedAt: date.toISOString(),
            ...(entry.claimedAt ? { claimedAt: entry.claimedAt } : {}),
          },
        },
      };
    }
  }

  return next;
}

/** 所持系の常設達成型ミッションをデッキ/アルバム状態と同期 */
export function syncPermanentOwnershipAchievements(
  state: MissionState,
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
  userLevel: number,
  date: Date = new Date(),
): MissionEventResult {
  const ownedAttributes = collectOwnedAttributes(decks, album);
  const newlyCompleted: MissionDefinition[] = [];
  let next = state;

  for (const mission of getActivePermanentAchievementMissions(userLevel)) {
    if (mission.eventType !== 'attribute_owned') continue;

    const matched =
      mission.condition?.attribute != null &&
      ownedAttributes.has(mission.condition.attribute);

    next = completeAchievementIfMatched(
      next,
      mission,
      matched,
      date,
      newlyCompleted,
    );
  }

  next = syncPermanentRarityOwnershipCounters(
    next,
    decks,
    album,
    date,
    newlyCompleted,
  );

  return { state: next, newlyCompleted };
}

/** 再戦以外のバトル勝利時: デッキ構成に応じた常設達成型ミッションを更新 */
export function reportPermanentDeckWinAchievements(
  state: MissionState,
  playerDeck: readonly Card[],
  userLevel: number,
  date: Date = new Date(),
): MissionEventResult {
  const newlyCompleted: MissionDefinition[] = [];
  let next = state;

  for (const mission of getActivePermanentAchievementMissions(userLevel)) {
    if (mission.eventType !== 'deck_win_with_attribute') continue;

    const matched =
      mission.condition?.attribute != null &&
      deckContainsAttribute(playerDeck, mission.condition.attribute);

    next = completeAchievementIfMatched(
      next,
      mission,
      matched,
      date,
      newlyCompleted,
    );
  }

  next = reportPermanentRarityDeckWinCounters(
    next,
    playerDeck,
    date,
    newlyCompleted,
  );

  return { state: next, newlyCompleted };
}

export function mergeMissionEventResults(
  initial: MissionEventResult,
  ...results: MissionEventResult[]
): MissionEventResult {
  let state = initial.state;
  const newlyCompleted = [...initial.newlyCompleted];
  for (const result of results) {
    state = result.state;
    newlyCompleted.push(...result.newlyCompleted);
  }
  return { state, newlyCompleted };
}
