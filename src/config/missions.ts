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
    reward: { px: 50 },
  },
  {
    id: 'daily_battle_win',
    category: 'daily',
    title: 'バトルで1勝',
    description: 'CPU戦に勝利する',
    eventType: 'battle_win',
    goal: 1,
    reward: { px: 80 },
  },
  {
    id: 'daily_card_create',
    category: 'daily',
    title: 'カード作成',
    description: '新しいカードを1枚作成する',
    eventType: 'card_created',
    goal: 1,
    reward: { px: 60 },
  },
  // --- ウィークリー ---
  {
    id: 'weekly_battle_win',
    category: 'weekly',
    title: 'バトル5勝',
    description: 'CPU戦に5回勝利する',
    eventType: 'battle_win',
    goal: 5,
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
  // --- ビギナー（仮チュートリアル） ---
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
    id: 'beginner_edit_card',
    category: 'beginner',
    title: 'カードを編集',
    description: 'カードを1回編集して保存する',
    eventType: 'card_edit_saved',
    goal: 1,
    reward: { px: 100 },
    unlockAfter: 'beginner_create_card',
    order: 2,
  },
  {
    id: 'beginner_battle_play',
    category: 'beginner',
    title: 'はじめてのバトル',
    description: 'CPU戦を1回プレイする',
    eventType: 'battle_play',
    goal: 1,
    reward: { px: 120, jewels: 5 },
    unlockAfter: 'beginner_edit_card',
    order: 3,
  },
  {
    id: 'beginner_battle_win',
    category: 'beginner',
    title: 'バトルに勝利',
    description: 'CPU戦に1回勝利する',
    eventType: 'battle_win',
    goal: 1,
    reward: { px: 150 },
    unlockAfter: 'beginner_battle_play',
    order: 4,
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
