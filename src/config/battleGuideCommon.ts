/** デッキ詳細などに表示するバトル用語ガイド（ATTRIBUTE_SPEC §2 要約） */

export type BattleGuideTermId =
  | 'melee'
  | 'shield'
  | 'shieldGrant'
  | 'bowAttack'
  | 'dualSecondaryAttack'
  | 'poisonEffect'
  | 'healCure'
  | 'healRecovery'
  | 'freeze'
  | 'storm'
  | 'stealth'
  | 'illuminate';

export interface BattleGuideTerm {
  id: BattleGuideTermId;
  label: string;
  title: string;
  items: string[];
  /** 短い説明用のコンパクトモーダル */
  compact?: boolean;
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

export const SHIELD_GUIDE: BattleGuideTerm = {
  id: 'shield',
  label: '盾',
  title: '盾',
  items: ['敵の攻撃を1回無効にする', '敵から攻撃を受けると消滅する'],
  compact: true,
};

export const SHIELD_GRANT_GUIDE: BattleGuideTerm = {
  id: 'shieldGrant',
  label: '盾付与',
  title: '盾付与',
  items: ['自分を含む盾なし味方に盾を付与', '盾付与は1回限り'],
  compact: true,
};

export const BOW_ATTACK_GUIDE: BattleGuideTerm = {
  id: 'bowAttack',
  label: '弓攻撃',
  title: '弓攻撃',
  items: ['攻撃相手からの反撃を受けない', 'バトル中2回まで', '弓同士の相打ちは、お互いの矢が相殺されてノーダメージ'],
  compact: true,
};

export const DUAL_SECONDARY_ATTACK_GUIDE: BattleGuideTerm = {
  id: 'dualSecondaryAttack',
  label: '副次攻撃',
  title: '副次攻撃',
  items: ['BPの50%相当のダメージを与える', '副次攻撃相手からは反撃を受けない'],
  compact: true,
};

export const POISON_EFFECT_GUIDE: BattleGuideTerm = {
  id: 'poisonEffect',
  label: '毒の効果',
  title: '毒の効果',
  items: [
    '毎ターン開始時、付与した相手に毒ダメージを与える',
    '毒ダメージ：毒の効果を付与した時の毒属性カードのBPの30%相当',
    '何度でも重ねがけ可能',
  ],
  compact: true,
};

export const HEAL_CURE_GUIDE: BattleGuideTerm = {
  id: 'healCure',
  label: '治癒',
  title: '治癒',
  items: [
    '対象のデバフ（毒、凍結）を解除する',
    '毒の効果を処理した後、盾付与・攻撃より先に処理される',
  ],
  compact: true,
};

export const HEAL_RECOVERY_GUIDE: BattleGuideTerm = {
  id: 'healRecovery',
  label: '回復',
  title: '回復',
  items: [
    'デバフを持たない対象のBPを回復する',
    '対象のBPを、自分の現BP相当回復する（ただし対象の最大BPを超えない）',
    '毒の効果を処理した後、盾付与・攻撃より先に処理される',
  ],
  compact: true,
};

export const FREEZE_GUIDE: BattleGuideTerm = {
  id: 'freeze',
  label: '凍結',
  title: '凍結',
  items: [
    '凍結した相手は次ターンの間、行動不能となる',
    '凍結の効果は盾で防ぐことができる',
    '重ねがけ可能',
  ],
  compact: true,
};

export const STORM_GUIDE: BattleGuideTerm = {
  id: 'storm',
  label: '嵐',
  title: '嵐',
  items: [
    '自分の現BPの50%相当のダメージをランダムな敵2体に与える',
    'バトル中、2回まで起こせる',
    'ステルス中の忍属性カードに当たると、ステルスを解除できる',
    '嵐による攻撃は反撃を受けない',
  ],
  compact: true,
};

export const STEALTH_GUIDE: BattleGuideTerm = {
  id: 'stealth',
  label: '潜伏状態',
  title: '潜伏状態',
  items: [
    '潜伏状態の間、敵から攻撃を受けない',
    '最初の近接攻撃では反撃を受けない',
    '盾付与・嵐・照射を受けると潜伏状態が解除される',
  ],
  compact: true,
};

export const ILLUMINATE_GUIDE: BattleGuideTerm = {
  id: 'illuminate',
  label: '照射',
  title: '照射',
  items: [
    '潜伏状態の敵1体を照射し、潜伏状態を解除する',
    '治癒・回復の処理後、盾付与・攻撃より先に処理される',
  ],
  compact: true,
};

export const BATTLE_GUIDE_TERMS: Record<BattleGuideTermId, BattleGuideTerm> = {
  melee: MELEE_ATTACK_GUIDE,
  shield: SHIELD_GUIDE,
  shieldGrant: SHIELD_GRANT_GUIDE,
  bowAttack: BOW_ATTACK_GUIDE,
  dualSecondaryAttack: DUAL_SECONDARY_ATTACK_GUIDE,
  poisonEffect: POISON_EFFECT_GUIDE,
  healCure: HEAL_CURE_GUIDE,
  healRecovery: HEAL_RECOVERY_GUIDE,
  freeze: FREEZE_GUIDE,
  storm: STORM_GUIDE,
  stealth: STEALTH_GUIDE,
  illuminate: ILLUMINATE_GUIDE,
};

/** 詳細説明内でリンク化する用語（長いラベル優先） */
export const LINKABLE_BATTLE_GUIDE_TERMS: BattleGuideTerm[] = Object.values(BATTLE_GUIDE_TERMS).sort(
  (a, b) => b.label.length - a.label.length,
);
