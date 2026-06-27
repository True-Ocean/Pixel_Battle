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
      '盾を持ち、味方にも盾を付与できる。',
    battleGuide: [
      '・バトル開始時から盾1枚を保有する',
      '・前衛時：近接攻撃または盾付与のどちらかを選べる',
      '・後衛時：盾付与のみ可能',
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
    description: 'どこからでも弓攻撃できる',
    battleGuide: [
      '・前衛、後衛どこからでも、好きな敵1体に弓攻撃可能',
      '・矢が切れた後は前衛での近接攻撃のみ可能',
      '・他属性よりBPが低い',
    ].join('\n'),
    bg: '#66aa44',
    border: '#448822',
  },
  dual: {
    label: '両',
    ariaName: '両属性',
    description: '敵前衛2体に同時に攻撃できる',
    battleGuide: [
      '・前衛にいるときのみ攻撃できる（後衛は行動不可）',
      '・敵前衛の1体に近接攻撃する際、もう片方の敵前衛にも副次攻撃を与える',
    ].join('\n'),
    bg: '#aa8844',
    border: '#886622',
  },
  poison: {
    label: '毒',
    ariaName: '毒属性',
    description: '敵に毒の効果を付与できる',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃できる（後衛は行動不可）',
      '・近接でダメージを与えた相手に、毒の効果を付与する',
    ].join('\n'),
    bg: '#8844aa',
    border: '#662288',
  },
  heal: {
    label: '癒',
    ariaName: '癒属性',
    description: '味方を治癒・回復できる',
    battleGuide: [
      '・後衛時：自分か味方を治癒または回復する',
      '・前衛時：近接攻撃するか、自分か味方を治癒または回復するかを選べる',
      '・治癒・回復はバトル中、2回まで',
    ].join('\n'),
    bg: '#44cc88',
    border: '#22aa66',
  },
  ice: {
    label: '氷',
    ariaName: '氷属性',
    description: '自分に触れた相手を凍結させる',
    battleGuide: [
      '・前衛にいるときのみ近接攻撃',
      '・近接攻撃で自分に触れた相手を凍結させる',
    ].join('\n'),
    bg: '#66ccff',
    border: '#3399cc',
  },
  storm: {
    label: '嵐',
    ariaName: '嵐属性',
    description:
      '嵐を起こして敵2体を攻撃する。',
    battleGuide: [
      '・後衛：嵐を起こせる',
      '・前衛：近接攻撃か、嵐を起こすかを選べる',
    ].join('\n'),
    bg: '#8888cc',
    border: '#6666aa',
  },
  ninja: {
    label: '忍',
    ariaName: '忍属性',
    description: '潜伏状態でバトルを開始する。',
    battleGuide: [
      '・潜伏状態でバトルを開始する',
      '・前衛にいるときのみ近接攻撃できる',
    ].join('\n'),
    bg: '#444444',
    border: '#222222',
  },
  illuminate: {
    label: '照',
    ariaName: '照属性',
    description:
      '潜伏状態の敵を照射して暴き出す',
    battleGuide: [
      '・後衛：潜伏状態の敵忍1体を選んで照射できる',
      '・前衛：近接攻撃か照射かを選べる',
    ].join('\n'),
    bg: '#ffdd66',
    border: '#ccaa33',
  },
};

// 解放順（Lv）: Lv6力 Lv11弓 Lv16両 Lv21毒 Lv26癒 Lv31氷 Lv36嵐 Lv41忍 Lv46照
// 詳細: docs/ATTRIBUTE_SPEC.md

export function getAttributeMeta(attribute: Attribute): AttributeMeta {
  return ATTRIBUTE_META[attribute];
}
