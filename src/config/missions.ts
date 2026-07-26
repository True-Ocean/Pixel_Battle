import type { MissionDefinition, MissionState } from '../mission/types';
import { OFFLINE_PVP_MIN_USER_LEVEL } from '../offlinePvp/unlock';
import {
  buildPermanentCounterMissionById,
  getActivePermanentMissions,
} from './permanentMissions';
import { buildPermanentAchievementById } from './permanentAchievements';

/** デイリー・ウィークリー・ビギナー（常設は state に応じて動的生成） */
export const MISSION_DEFINITIONS: readonly MissionDefinition[] = [
  // --- デイリー ---
  {
    id: 'daily_login',
    category: 'daily',
    title: 'ログイン',
    description: 'アプリを起動する',
    eventType: 'app_open',
    goal: 1,
    reward: { px: 5 },
  },
  {
    id: 'daily_cpu_battle_win_1',
    category: 'daily',
    title: 'CPU戦1勝',
    description: 'CPU戦に1回勝利する',
    eventType: 'cpu_battle_win',
    goal: 1,
    reward: { px: 5 },
  },
  {
    id: 'daily_cpu_battle_win_3',
    category: 'daily',
    title: 'CPU戦3勝',
    description: 'CPU戦に3回勝利する',
    eventType: 'cpu_battle_win',
    goal: 3,
    reward: { px: 10 },
  },
  {
    id: 'daily_cpu_battle_win_5',
    category: 'daily',
    title: 'CPU戦5勝',
    description: 'CPU戦に5回勝利する',
    eventType: 'cpu_battle_win',
    goal: 5,
    reward: { jewels: 2 },
    maxUserLevel: OFFLINE_PVP_MIN_USER_LEVEL - 1,
  },
  {
    id: 'daily_offline_pvp_battle_win_1',
    category: 'daily',
    title: '公開デッキ戦1勝',
    description: '公開デッキ戦に1回勝利する',
    eventType: 'offline_pvp_battle_win',
    goal: 1,
    reward: { px: 5 },
    minUserLevel: OFFLINE_PVP_MIN_USER_LEVEL,
  },
  {
    id: 'daily_offline_pvp_battle_win_3',
    category: 'daily',
    title: '公開デッキ戦3勝',
    description: '公開デッキ戦に3回勝利する',
    eventType: 'offline_pvp_battle_win',
    goal: 3,
    reward: { jewels: 2 },
    minUserLevel: OFFLINE_PVP_MIN_USER_LEVEL,
  },
  // --- ウィークリー ---
  {
    id: 'weekly_login_5',
    category: 'weekly',
    title: 'ログイン5日',
    description: '7日間のうち5日アプリを起動する',
    eventType: 'app_open',
    goal: 5,
    reward: { px: 10 },
  },
  {
    id: 'weekly_cpu_battle_win_10',
    category: 'weekly',
    title: 'CPU戦5勝',
    description: 'CPU戦に5回勝利する',
    eventType: 'cpu_battle_win',
    goal: 5,
    reward: { px: 10 },
  },
  {
    id: 'weekly_cpu_battle_win_20',
    category: 'weekly',
    title: 'CPU戦10勝',
    description: 'CPU戦に10回勝利する',
    eventType: 'cpu_battle_win',
    goal: 10,
    reward: { px: 20 },
  },
  {
    id: 'weekly_offline_pvp_battle_win_10',
    category: 'weekly',
    title: '公開デッキ戦5勝',
    description: '公開デッキ戦に5回勝利する',
    eventType: 'offline_pvp_battle_win',
    goal: 5,
    reward: { px: 10 },
    minUserLevel: OFFLINE_PVP_MIN_USER_LEVEL,
  },
  {
    id: 'weekly_offline_pvp_battle_win_20',
    category: 'weekly',
    title: '公開デッキ戦10勝',
    description: '公開デッキ戦に10回勝利する',
    eventType: 'offline_pvp_battle_win',
    goal: 10,
    reward: { jewels: 3 },
    minUserLevel: OFFLINE_PVP_MIN_USER_LEVEL,
  },
  {
    id: 'weekly_attribute_retouch',
    category: 'weekly',
    title: '属性リタッチ',
    description: '属性リタッチを1回行う',
    eventType: 'attribute_retouch',
    goal: 1,
    reward: { px: 15 },
  },
  {
    id: 'weekly_limit_break',
    category: 'weekly',
    title: '限界突破',
    description: '限界突破を1回行う',
    eventType: 'limit_break',
    goal: 1,
    reward: { jewels: 3 },
  },
  // --- ビギナー（チュートリアル） ---
  {
    id: 'beginner_create_card',
    category: 'beginner',
    title: 'はじめてのカード',
    description: '新しいカードを1枚作成する',
    eventType: 'card_created',
    goal: 1,
    reward: { px: 150, jewels: 5 },
    order: 1,
  },
  {
    id: 'beginner_fill_deck',
    category: 'beginner',
    title: 'デッキを完成させよう',
    description: 'あと4枚作成し、合計5枚にそろえる',
    eventType: 'card_created',
    goal: 4,
    reward: { px: 200, jewels: 5 },
    order: 2,
  },
  {
    id: 'beginner_edit_card',
    category: 'beginner',
    title: 'カードを編集',
    description: 'カードを1回編集して保存する',
    eventType: 'card_edit_saved',
    goal: 1,
    reward: { px: 100 },
    order: 3,
  },
  {
    id: 'beginner_deck_reorder',
    category: 'beginner',
    title: 'デッキを並べ替え',
    description: 'マイデッキでカードを長押しして1回並べ替える',
    eventType: 'deck_reordered',
    goal: 1,
    reward: { px: 80 },
    order: 4,
  },
  {
    id: 'beginner_attribute_guide',
    category: 'beginner',
    title: '属性の説明を読む',
    description: 'マイデッキのカード詳細で、属性の ▼ から詳しい説明を開く',
    eventType: 'attribute_battle_guide_viewed',
    goal: 1,
    reward: { px: 60 },
    order: 5,
  },
  {
    id: 'beginner_attribute_retouch',
    category: 'beginner',
    title: '属性リタッチ',
    description: 'カード詳細から属性リタッチを1回行う',
    eventType: 'attribute_retouch',
    goal: 1,
    reward: { px: 300 },
    order: 6,
  },
  {
    id: 'beginner_battle_play',
    category: 'beginner',
    title: 'はじめてのバトル',
    description: 'CPU戦を1回プレイする',
    eventType: 'battle_play',
    goal: 1,
    reward: { px: 120, jewels: 5 },
    order: 7,
  },
  {
    id: 'beginner_battle_log',
    category: 'beginner',
    title: 'バトルログを確認',
    description: 'バトル終了後、「バトルログ」ボタンから戦闘の記録を確認する',
    eventType: 'battle_log_viewed',
    goal: 1,
    reward: { px: 60 },
    order: 8,
  },
  {
    id: 'beginner_battle_win',
    category: 'beginner',
    title: 'バトルに勝利',
    description: 'CPU戦に1回勝利する',
    eventType: 'battle_win',
    goal: 1,
    reward: { px: 150 },
    order: 9,
  },
  {
    id: 'beginner_history_opponent_detail',
    category: 'beginner',
    title: '相手カードを確認',
    description: 'バトル履歴の対戦詳細から、相手カードを1枚タップして詳細を見る',
    eventType: 'history_opponent_detail_viewed',
    goal: 1,
    reward: { px: 80 },
    order: 10,
  },
  {
    id: 'beginner_history_rematch',
    category: 'beginner',
    title: '履歴から再戦',
    description: 'バトル履歴から「もう一度対戦する」を1回実行する',
    eventType: 'history_rematch_play',
    goal: 1,
    reward: { px: 80 },
    order: 11,
  },
  {
    id: 'beginner_limit_break',
    category: 'beginner',
    title: '限界突破',
    description: 'いずれかのカードで限界突破を1回行う',
    eventType: 'limit_break',
    goal: 1,
    reward: { universalShards: 10 },
    order: 12,
  },
] as const;

export type MissionId = (typeof MISSION_DEFINITIONS)[number]['id'];

const MISSION_BY_ID = new Map<string, MissionDefinition>(
  MISSION_DEFINITIONS.map((mission) => [mission.id, mission]),
);

export function isMissionAvailableAtUserLevel(
  mission: MissionDefinition,
  userLevel: number,
): boolean {
  const level = Math.floor(userLevel);
  if (mission.minUserLevel != null && level < mission.minUserLevel) return false;
  if (mission.maxUserLevel != null && level > mission.maxUserLevel) return false;
  return true;
}

function filterMissionsByUserLevel(
  missions: readonly MissionDefinition[],
  userLevel: number,
): MissionDefinition[] {
  return missions.filter((mission) => isMissionAvailableAtUserLevel(mission, userLevel));
}

/** リセット用: レベル制限を無視してカテゴリ内の全定義を返す */
export function getAllStaticMissionsByCategory(
  category: MissionDefinition['category'],
): MissionDefinition[] {
  return MISSION_DEFINITIONS.filter((mission) => mission.category === category);
}

export function getMissionDefinitions(
  state: MissionState,
  userLevel: number = 1,
): MissionDefinition[] {
  return [
    ...filterMissionsByUserLevel(MISSION_DEFINITIONS, userLevel),
    ...getActivePermanentMissions(state, userLevel),
  ];
}

export function getMissionById(
  id: string,
  state?: MissionState,
  userLevel: number = 1,
): MissionDefinition | undefined {
  const staticMission = MISSION_BY_ID.get(id);
  if (staticMission) return staticMission;
  const permanentMission = buildPermanentCounterMissionById(id);
  if (permanentMission) return permanentMission;
  const achievementMission = buildPermanentAchievementById(id);
  if (achievementMission) return achievementMission;
  if (!state) return undefined;
  const active = getActivePermanentMissions(state, userLevel);
  return active.find((mission) => mission.id === id);
}

export function getMissionsByCategory(
  category: MissionDefinition['category'],
  state?: MissionState,
  userLevel: number = 1,
): MissionDefinition[] {
  if (category === 'permanent') {
    return state ? getActivePermanentMissions(state, userLevel) : [];
  }
  return filterMissionsByUserLevel(
    MISSION_DEFINITIONS.filter((mission) => mission.category === category),
    userLevel,
  );
}

export function getBeginnerMissions(): MissionDefinition[] {
  return getMissionsByCategory('beginner').slice().sort((a, b) => {
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
