import type { MissionDefinition, MissionState } from '../mission/types';
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
    reward: { px: 15, jewels: 1 },
  },
  {
    id: 'daily_card_edit',
    category: 'daily',
    title: 'カード編集',
    description: 'カードを1回編集して保存する',
    eventType: 'card_edit_saved',
    goal: 1,
    reward: { px: 5 },
  },
  {
    id: 'daily_history_rematch_win',
    category: 'daily',
    title: '履歴再戦で勝利',
    description: 'バトル履歴から再戦して1回勝利する',
    eventType: 'history_rematch_win',
    goal: 1,
    reward: { px: 5 },
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
    title: 'CPU戦10勝',
    description: 'CPU戦に10回勝利する',
    eventType: 'cpu_battle_win',
    goal: 10,
    reward: { px: 10 },
  },
  {
    id: 'weekly_cpu_battle_win_20',
    category: 'weekly',
    title: 'CPU戦20勝',
    description: 'CPU戦に20回勝利する',
    eventType: 'cpu_battle_win',
    goal: 20,
    reward: { px: 20 },
  },
  {
    id: 'weekly_cpu_battle_win_30',
    category: 'weekly',
    title: 'CPU戦30勝',
    description: 'CPU戦に30回勝利する',
    eventType: 'cpu_battle_win',
    goal: 30,
    reward: { jewels: 5 },
  },
  {
    id: 'weekly_history_rematch_win_2',
    category: 'weekly',
    title: '履歴再戦2勝',
    description: 'バトル履歴から再戦して2回勝利する',
    eventType: 'history_rematch_win',
    goal: 2,
    reward: { px: 10 },
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
    reward: { jewels: 5 },
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
    unlockAfter: 'beginner_create_card',
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
    unlockAfter: 'beginner_fill_deck',
    order: 3,
  },
  {
    id: 'beginner_deck_reorder',
    category: 'beginner',
    title: 'デッキを並べ替え',
    description: 'マイデッキでカードの順番を1回変える',
    eventType: 'deck_reordered',
    goal: 1,
    reward: { px: 80 },
    unlockAfter: 'beginner_edit_card',
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
    unlockAfter: 'beginner_deck_reorder',
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
    unlockAfter: 'beginner_attribute_guide',
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
    unlockAfter: 'beginner_attribute_retouch',
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
    unlockAfter: 'beginner_battle_play',
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
    unlockAfter: 'beginner_battle_log',
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
    unlockAfter: 'beginner_battle_win',
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
    unlockAfter: 'beginner_history_opponent_detail',
    order: 11,
  },
  {
    id: 'beginner_limit_break',
    category: 'beginner',
    title: '限界突破',
    description: 'どのカードでも限界突破を1回行う',
    eventType: 'limit_break',
    goal: 1,
    reward: { universalShards: 10 },
    unlockAfter: 'beginner_history_rematch',
    order: 12,
  },
] as const;

export type MissionId = (typeof MISSION_DEFINITIONS)[number]['id'];

const MISSION_BY_ID = new Map<string, MissionDefinition>(
  MISSION_DEFINITIONS.map((mission) => [mission.id, mission]),
);

export function getMissionDefinitions(
  state: MissionState,
  userLevel: number = 1,
): MissionDefinition[] {
  return [...MISSION_DEFINITIONS, ...getActivePermanentMissions(state, userLevel)];
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
  return MISSION_DEFINITIONS.filter((mission) => mission.category === category);
}

export function getBeginnerMissions(): MissionDefinition[] {
  return getMissionsByCategory('beginner').slice().sort((a, b) => {
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
