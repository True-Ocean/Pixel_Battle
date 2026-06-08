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

/** Lv0 以降の属性表示マスタ（色・ラベルはここで一元管理） */
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
};

// 将来追加予定: 弓・両・癒・毒・氷・嵐・忍・力

export function getAttributeMeta(attribute: Attribute): AttributeMeta {
  return ATTRIBUTE_META[attribute];
}
