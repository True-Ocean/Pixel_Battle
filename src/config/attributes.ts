import type { Attribute } from '../types';

export interface AttributeMeta {
  /** カード上に表示する漢字1文字 */
  label: string;
  /** 読み上げ・ツールチップ用 */
  ariaName: string;
  /** カード詳細などに表示する簡易説明 */
  description: string;
  /** 詳細カード内の折りたたみ「戦い方」本文（white-space: pre-line） */
  battleGuide: string;
  bg: string;
  border: string;
}

/** 全属性の表示マスタ（色・ラベルはここで一元管理） */
export const ATTRIBUTE_META: Record<Attribute, AttributeMeta> = {
  attack: {
    label: '剣',
    ariaName: '剣属性',
    description: '通常攻撃のみ（特殊能力なし）',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃できる（後衛は行動不可）',
      '・敵前衛のいずれか1体を選んで攻撃',
      '・特殊能力なし',
    ].join('\n'),
    bg: '#e24a4a',
    border: '#b83232',
  },
  defense: {
    label: '盾',
    ariaName: '盾属性',
    description:
      '敵の攻撃を1回無効にする盾を保有する\n味方1体に対して一度だけ盾を付与できる',
    battleGuide: [
      '・バトル開始時から盾1枚を所持',
      '・前衛時：近接攻撃または盾付与のどちらか',
      '・後衛時：盾付与のみ',
      '',
      '　盾：敵の攻撃を1回無効、敵から攻撃を受けると消滅',
      '　盾付与：自分以外の盾なし味方に付与（1回限り）',
    ].join('\n'),
    bg: '#4488ff',
    border: '#2266cc',
  },
  power: {
    label: '力',
    ariaName: '力属性',
    description: '他属性より高いBPを持つ',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃できる（後衛は行動不可）',
      '・敵前衛のいずれか1体を選んで攻撃',
      '・他属性よりBPが高い',
      '・特殊能力なし',
    ].join('\n'),
    bg: '#cc6622',
    border: '#994411',
  },
  bow: {
    label: '弓',
    ariaName: '弓属性',
    description: 'どこからでも弓で攻撃できる\n反撃なし・1戦闘2矢',
    battleGuide: [
      '・前衛、後衛どこからでも、好きな敵1体に弓で攻撃できる',
      '・弓攻撃は、攻撃相手からの反撃を受けない',
      '・1枚あたり1戦闘2矢まで（矢切れ後は前衛のみ近接攻撃可）',
      '・他属性よりBPが低い',
    ].join('\n'),
    bg: '#66aa44',
    border: '#448822',
  },
  dual: {
    label: '両',
    ariaName: '両属性',
    description: '敵前衛の1体に近接攻撃すると、\nもう片方の敵前衛にもダメージを与える',
    battleGuide: [
      '・前衛にいるときのみ攻撃できる（後衛は行動不可）',
      '・敵前衛の1体に近接攻撃すると、もう片方の敵前衛にも50%の副次的なダメージを与える',
      '・副次的なダメージを与えた相手からは反撃を受けない',
    ].join('\n'),
    bg: '#aa8844',
    border: '#886622',
  },
  poison: {
    label: '毒',
    ariaName: '毒属性',
    description: '近接でダメージを与えた相手に毒を付与し、\n毎ターン毒ダメージが続く',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃できる（後衛は行動不可）',
      '・近接でダメージを与えた相手に、毒の効果を付与する',
      '・毎ターン開始時、毒を付与した時のBPの30%の毒ダメージを与える（重ねがけあり）',
    ].join('\n'),
    bg: '#8844aa',
    border: '#662288',
  },
  heal: {
    label: '癒',
    ariaName: '癒属性',
    description: '味方を回復する（2回まで）\n毒効果も同時に無効化できる',
    battleGuide: [
      '・後衛にいるとき：回復のみ',
      '・前衛にいるとき：近接攻撃または回復',
      '・自分の現BP分の回復を付与する（最大BPを超えない）',
      '・回復付与は2回まで',
      '・回復は毒ダメージの後、盾付与・攻撃より先に処理される',
      '・他属性よりBPが低い（弓と同程度）',
    ].join('\n'),
    bg: '#44cc88',
    border: '#22aa66',
  },
  ice: {
    label: '氷',
    ariaName: '氷属性',
    description: '近接攻撃で戦った相手を凍結させる\n（相手は次ターン行動不能）',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃',
      '・近接攻撃で戦った相手を凍結させ、次ターンの間、行動不能にする',
      '・凍結したカードのBPは回復できるが、凍結は解除できない',
    ].join('\n'),
    bg: '#66ccff',
    border: '#3399cc',
  },
  storm: {
    label: '嵐',
    ariaName: '嵐属性',
    description: '1回/戦闘・currentBp分割ダメージ（Phase 6）',
    battleGuide: [
      '・1戦闘1回、currentBp×25%を別ユニット2体へ（バトル未実装）',
      '・反撃なし',
    ].join('\n'),
    bg: '#8888cc',
    border: '#6666aa',
  },
  ninja: {
    label: '忍',
    ariaName: '忍属性',
    description: '後衛ステルス・初回無反撃（Phase 8）',
    battleGuide: [
      '・後衛にいるとき：ステルス（行動不可）（バトル未実装）',
      '・前衛に上がってから近接。初回1回だけ無反撃',
      '・ダメージ・回復等でステルス解除',
    ].join('\n'),
    bg: '#444444',
    border: '#222222',
  },
};

// 解放順（Lv）: Lv6力 Lv11弓 Lv16両 Lv21毒 Lv26癒 Lv31氷 Lv36嵐 Lv41忍
// 詳細: docs/ATTRIBUTE_SPEC.md

export function getAttributeMeta(attribute: Attribute): AttributeMeta {
  return ATTRIBUTE_META[attribute];
}
