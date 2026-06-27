import type { MissionDefinition } from '../mission/types';

/** MVP 用ミッション定義（件数は config 追加で増減） */
export const MISSION_DEFINITIONS: readonly MissionDefinition[] = [
  // --- デイリー ---
  {
    id: 'daily_login',
    category: 'daily',
    title: 'ログイン',
    description: 'アプリを起動する',
    eventType: 'app_open',
    goal: 1,
    reward: { px: 40 },
  },
  {
    id: 'daily_cpu_battle_win_1',
    category: 'daily',
    title: 'CPU戦1勝',
    description: 'CPU戦に1回勝利する',
    eventType: 'cpu_battle_win',
    goal: 1,
    reward: { px: 50 },
  },
  {
    id: 'daily_cpu_battle_win_3',
    category: 'daily',
    title: 'CPU戦3勝',
    description: 'CPU戦に3回勝利する',
    eventType: 'cpu_battle_win',
    goal: 3,
    reward: { px: 60 },
  },
  {
    id: 'daily_cpu_battle_win_5',
    category: 'daily',
    title: 'CPU戦5勝',
    description: 'CPU戦に5回勝利する',
    eventType: 'cpu_battle_win',
    goal: 5,
    reward: { px: 80, jewels: 1 },
  },
  {
    id: 'daily_card_edit',
    category: 'daily',
    title: 'カード編集',
    description: 'カードを1回編集して保存する',
    eventType: 'card_edit_saved',
    goal: 1,
    reward: { px: 40 },
  },
  {
    id: 'daily_history_rematch_win',
    category: 'daily',
    title: '履歴再戦で勝利',
    description: 'バトル履歴から再戦して1回勝利する',
    eventType: 'history_rematch_win',
    goal: 1,
    reward: { px: 50 },
  },
  // --- ウィークリー ---
  {
    id: 'weekly_battle_win',
    category: 'weekly',
    title: 'CPU戦10勝',
    description: 'CPU戦に10回勝利する',
    eventType: 'cpu_battle_win',
    goal: 10,
    reward: { jewels: 5 },
  },
  {
    id: 'weekly_battle_play',
    category: 'weekly',
    title: 'バトル10回',
    description: 'CPU戦を10回プレイする',
    eventType: 'battle_play',
    goal: 10,
    reward: { px: 150 },
  },
  {
    id: 'weekly_card_edit',
    category: 'weekly',
    title: 'カード編集3回',
    description: 'カードを3回編集して保存する',
    eventType: 'card_edit_saved',
    goal: 3,
    reward: { px: 120 },
  },
  // --- 常設 ---
  {
    id: 'permanent_battle_win_10',
    category: 'permanent',
    title: '累計10勝',
    description: 'CPU戦に累計10回勝利する',
    eventType: 'battle_win',
    goal: 10,
    reward: { jewels: 10 },
  },
  {
    id: 'permanent_card_create_5',
    category: 'permanent',
    title: '累計5枚作成',
    description: 'カードを累計5枚作成する',
    eventType: 'card_created',
    goal: 5,
    reward: { px: 200 },
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

export function getMissionById(id: string): MissionDefinition | undefined {
  return MISSION_BY_ID.get(id);
}

export function getMissionsByCategory(
  category: MissionDefinition['category'],
): MissionDefinition[] {
  return MISSION_DEFINITIONS.filter((mission) => mission.category === category);
}

export function getBeginnerMissions(): MissionDefinition[] {
  return getMissionsByCategory('beginner').slice().sort((a, b) => {
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
