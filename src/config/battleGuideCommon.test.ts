import { describe, expect, it } from 'vitest';
import {
  BOW_ATTACK_GUIDE,
  DUAL_SECONDARY_ATTACK_GUIDE,
  FREEZE_GUIDE,
  HEAL_CURE_GUIDE,
  HEAL_RECOVERY_GUIDE,
  ILLUMINATE_GUIDE,
  LINKABLE_BATTLE_GUIDE_TERMS,
  MELEE_ATTACK_GUIDE,
  POISON_EFFECT_GUIDE,
  SHIELD_GRANT_GUIDE,
  SHIELD_GUIDE,
  STEALTH_GUIDE,
  STORM_GUIDE,
} from '../config/battleGuideCommon';

describe('MELEE_ATTACK_GUIDE', () => {
  it('近接攻撃の共通ルール4項目を含む', () => {
    expect(MELEE_ATTACK_GUIDE.label).toBe('近接攻撃');
    expect(MELEE_ATTACK_GUIDE.items).toHaveLength(4);
    expect(MELEE_ATTACK_GUIDE.items[0]).toContain('BP相当のダメージ');
    expect(MELEE_ATTACK_GUIDE.items[2]).toContain('50%');
  });
});

describe('shield battle guide terms', () => {
  it('盾の説明を2項目に分ける', () => {
    expect(SHIELD_GUIDE.items).toEqual([
      '敵の攻撃を1回無効にする',
      '敵から攻撃を受けると消滅する',
    ]);
    expect(SHIELD_GUIDE.compact).toBe(true);
  });

  it('盾付与はコンパクトモーダル', () => {
    expect(SHIELD_GRANT_GUIDE.items).toEqual([
      '自分を含む盾なし味方に盾を付与',
      '盾付与は1回限り',
    ]);
    expect(SHIELD_GRANT_GUIDE.compact).toBe(true);
  });

  it('リンク化は長いラベル（盾付与）を盾より先にマッチする', () => {
    const labels = LINKABLE_BATTLE_GUIDE_TERMS.map((term) => term.label);
    expect(labels.indexOf('盾付与')).toBeLessThan(labels.indexOf('盾'));
  });
});

describe('bow attack battle guide term', () => {
  it('弓攻撃の説明をコンパクトモーダルで定義する', () => {
    expect(BOW_ATTACK_GUIDE.items[0]).toBe('攻撃相手からの反撃を受けない');
    expect(BOW_ATTACK_GUIDE.items[1]).toBe('バトル中2回まで');
    expect(BOW_ATTACK_GUIDE.compact).toBe(true);
  });
});

describe('dual secondary attack battle guide term', () => {
  it('副次攻撃の説明を2項目に分ける', () => {
    expect(DUAL_SECONDARY_ATTACK_GUIDE.items).toEqual([
      'BPの50%相当のダメージを与える',
      '副次攻撃相手からは反撃を受けない',
    ]);
    expect(DUAL_SECONDARY_ATTACK_GUIDE.compact).toBe(true);
  });
});

describe('poison effect battle guide term', () => {
  it('毒の効果の説明を3項目に分ける', () => {
    expect(POISON_EFFECT_GUIDE.items).toEqual([
      '毎ターン開始時、付与した相手に毒ダメージを与える',
      '毒ダメージ：毒の効果を付与した時の毒属性カードのBPの30%相当',
      '何度でも重ねがけ可能',
    ]);
    expect(POISON_EFFECT_GUIDE.compact).toBe(true);
  });
});

describe('heal battle guide terms', () => {
  it('治癒の説明をコンパクトモーダルで定義する', () => {
    expect(HEAL_CURE_GUIDE.items).toEqual([
      '対象のデバフ（毒、凍結）を解除する',
      '毒の効果を処理した後、盾付与・攻撃より先に処理される',
    ]);
    expect(HEAL_CURE_GUIDE.compact).toBe(true);
  });

  it('回復の説明をコンパクトモーダルで定義する', () => {
    expect(HEAL_RECOVERY_GUIDE.items).toEqual([
      'デバフを持たない対象のBPを回復する',
      '対象のBPを、自分の現BP相当回復する（ただし対象の最大BPを超えない）',
      '毒の効果を処理した後、盾付与・攻撃より先に処理される',
    ]);
    expect(HEAL_RECOVERY_GUIDE.compact).toBe(true);
  });
});

describe('freeze battle guide term', () => {
  it('凍結の説明を3項目に分ける', () => {
    expect(FREEZE_GUIDE.items).toEqual([
      '凍結した相手は次ターンの間、行動不能となる',
      '凍結の効果は盾で防ぐことができる',
      '重ねがけ可能',
    ]);
    expect(FREEZE_GUIDE.compact).toBe(true);
  });
});

describe('storm battle guide term', () => {
  it('嵐の説明を4項目に分ける', () => {
    expect(STORM_GUIDE.items).toEqual([
      '自分の現BPの50%相当のダメージをランダムな敵2体に与える',
      'バトル中、2回まで起こせる',
      'ステルス中の忍属性カードに当たると、ステルスを解除できる',
      '嵐による攻撃は反撃を受けない',
    ]);
    expect(STORM_GUIDE.compact).toBe(true);
  });
});

describe('stealth battle guide term', () => {
  it('潜伏状態の説明を3項目に分ける', () => {
    expect(STEALTH_GUIDE.items).toEqual([
      '潜伏状態の間、敵から攻撃を受けない',
      '最初の近接攻撃では反撃を受けない',
      '盾付与・嵐・照射を受けると潜伏状態が解除される',
    ]);
    expect(STEALTH_GUIDE.compact).toBe(true);
  });
});

describe('illuminate battle guide term', () => {
  it('照射の説明を2項目に分ける', () => {
    expect(ILLUMINATE_GUIDE.items).toEqual([
      '潜伏状態の敵1体を照射し、潜伏状態を解除する',
      '治癒・回復の処理後、盾付与・攻撃より先に処理される',
    ]);
    expect(ILLUMINATE_GUIDE.compact).toBe(true);
  });
});
