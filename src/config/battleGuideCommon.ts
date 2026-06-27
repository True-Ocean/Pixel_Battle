/** デッキ詳細などに表示するバトル用語ガイド（ATTRIBUTE_SPEC §2 要約） */

export type BattleGuideTermId = 'melee';

export interface BattleGuideTerm {
  id: BattleGuideTermId;
  label: string;
  title: string;
  items: string[];
}

export const MELEE_ATTACK_GUIDE: BattleGuideTerm = {
  id: 'melee',
  label: '近接攻撃',
  title: '近接攻撃',
  items: [
    '前衛にいるとき、敵前衛のどちらかに対して近接攻撃でき、自分のBP相当のダメージを与える',
    '相打ちだった場合：相手のBP相当の反撃を受ける',
    '一方的に攻撃した場合：相手のBPの50%相当の反撃を受ける',
    '近接攻撃は、BPが大きい順に処理され、BPが同じ場合は\n　属性＞レア度＞限界突破＞ランダム\nの順に処理される',
  ],
};

export const BATTLE_GUIDE_TERMS: Record<BattleGuideTermId, BattleGuideTerm> = {
  melee: MELEE_ATTACK_GUIDE,
};

/** 詳細説明内でリンク化する用語（長いラベル優先） */
export const LINKABLE_BATTLE_GUIDE_TERMS: BattleGuideTerm[] = Object.values(BATTLE_GUIDE_TERMS).sort(
  (a, b) => b.label.length - a.label.length,
);
