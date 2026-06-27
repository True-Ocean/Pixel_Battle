import type { MissionDefinition, MissionReward } from '../mission/types';
import type { Attribute } from '../types';
import { ATTRIBUTE_META } from './attributes';
import {
  ATTRIBUTE_UNLOCK_SCHEDULE,
  isAttributeUnlockedAtLevel,
} from './attributeUnlock';

export const PERMANENT_ATTRIBUTE_OWNERSHIP_REWARD: MissionReward = { px: 10 };
export const PERMANENT_ATTRIBUTE_DECK_WIN_REWARD: MissionReward = { jewels: 5 };

function buildPermanentAttributeOwnershipMission(
  attribute: Attribute,
): MissionDefinition {
  const meta = ATTRIBUTE_META[attribute];
  const id = `permanent_own_attribute_${attribute}`;
  return {
    id,
    category: 'permanent',
    title: `${meta.label}属性を所持`,
    description: `${meta.ariaName}のカードを1枚以上所持する`,
    eventType: 'attribute_owned',
    goal: 1,
    reward: PERMANENT_ATTRIBUTE_OWNERSHIP_REWARD,
    displayTrackId: id,
    condition: { attribute },
  };
}

function buildPermanentAttributeDeckWinMission(
  attribute: Attribute,
): MissionDefinition {
  const meta = ATTRIBUTE_META[attribute];
  const id = `permanent_win_with_attribute_${attribute}`;
  return {
    id,
    category: 'permanent',
    title: `${meta.label}属性で勝利`,
    description: `${meta.ariaName}のカードを含むデッキで勝利する`,
    eventType: 'deck_win_with_attribute',
    goal: 1,
    reward: PERMANENT_ATTRIBUTE_DECK_WIN_REWARD,
    displayTrackId: id,
    condition: { attribute },
  };
}

const ALL_PERMANENT_ACHIEVEMENT_MISSIONS: readonly MissionDefinition[] =
  ATTRIBUTE_UNLOCK_SCHEDULE.flatMap(({ attribute }) => [
    buildPermanentAttributeOwnershipMission(attribute),
    buildPermanentAttributeDeckWinMission(attribute),
  ]);

const PERMANENT_ACHIEVEMENT_BY_ID = new Map(
  ALL_PERMANENT_ACHIEVEMENT_MISSIONS.map((mission) => [mission.id, mission]),
);

export const PERMANENT_ACHIEVEMENT_TRACK_IDS: readonly string[] =
  ALL_PERMANENT_ACHIEVEMENT_MISSIONS.map(
    (mission) => mission.displayTrackId ?? mission.id,
  );

export function buildPermanentAchievementById(
  missionId: string,
): MissionDefinition | undefined {
  return PERMANENT_ACHIEVEMENT_BY_ID.get(missionId);
}

export function getActivePermanentAchievementMissions(
  userLevel: number,
): MissionDefinition[] {
  const missions: MissionDefinition[] = [];

  for (const { attribute } of ATTRIBUTE_UNLOCK_SCHEDULE) {
    if (!isAttributeUnlockedAtLevel(attribute, userLevel)) continue;
    missions.push(buildPermanentAttributeOwnershipMission(attribute));
    missions.push(buildPermanentAttributeDeckWinMission(attribute));
  }

  return missions;
}
