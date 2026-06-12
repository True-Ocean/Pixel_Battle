import type { Attribute } from '../types';

export interface AttributeMeta {
  /** カード上に表示する漢字1文字 */
  label: string;
  /** 読み上げ・ツールチップ用 */
  ariaName: string;
  /** カード詳細などに表示する簡易説明 */
  description: string;
  bg: string;
  border: string;
}

/** 全属性の表示マスタ（色・ラベルはここで一元管理） */
export const ATTRIBUTE_META: Record<Attribute, AttributeMeta> = {
  attack: {
    label: '剣',
    ariaName: '剣属性',
    description: '通常攻撃のみ（特殊能力なし）',
    bg: '#e24a4a',
    border: '#b83232',
  },
  defense: {
    label: '盾',
    ariaName: '盾属性',
    description:
      '敵の攻撃を1回無効にする盾を保有する\n味方1体に対して一度だけ盾を付与できる',
    bg: '#4488ff',
    border: '#2266cc',
  },
  power: {
    label: '力',
    ariaName: '力属性',
    description: '他属性より高いBPを持つ',
    bg: '#cc6622',
    border: '#994411',
  },
  bow: {
    label: '弓',
    ariaName: '弓属性',
    description: '後衛から距離攻撃（Phase 2）',
    bg: '#66aa44',
    border: '#448822',
  },
  dual: {
    label: '両',
    ariaName: '両属性',
    description: '前衛近接＋副前衛50%追加攻撃（Phase 3）',
    bg: '#aa8844',
    border: '#886622',
  },
  poison: {
    label: '毒',
    ariaName: '毒属性',
    description: '近接で毒スタック付与・DoT（Phase 4）',
    bg: '#8844aa',
    border: '#662288',
  },
  heal: {
    label: '癒',
    ariaName: '癒属性',
    description: '味方回復・攻撃フェーズ前に解決（Phase 5）',
    bg: '#44cc88',
    border: '#22aa66',
  },
  ice: {
    label: '氷',
    ariaName: '氷属性',
    description: '近接で次ターン行動不能（Phase 7）',
    bg: '#66ccff',
    border: '#3399cc',
  },
  storm: {
    label: '嵐',
    ariaName: '嵐属性',
    description: '1回/戦闘・currentBp分割ダメージ（Phase 6）',
    bg: '#8888cc',
    border: '#6666aa',
  },
  ninja: {
    label: '忍',
    ariaName: '忍属性',
    description: '後衛ステルス・初回無反撃（Phase 8）',
    bg: '#444444',
    border: '#222222',
  },
};

// 解放順（Lv）: Lv6力 Lv11弓 Lv16両 Lv21毒 Lv26癒 Lv31氷 Lv36嵐 Lv41忍
// 詳細: docs/ATTRIBUTE_SPEC.md

export function getAttributeMeta(attribute: Attribute): AttributeMeta {
  return ATTRIBUTE_META[attribute];
}
