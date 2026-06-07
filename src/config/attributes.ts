import type { Attribute } from '../types';

export interface AttributeMeta {
  /** カード上に表示する漢字1文字 */
  label: string;
  /** 読み上げ・ツールチップ用 */
  ariaName: string;
  bg: string;
  border: string;
}

/** Lv0 以降の属性表示マスタ（色・ラベルはここで一元管理） */
export const ATTRIBUTE_META: Record<Attribute, AttributeMeta> = {
  attack: {
    label: '剣',
    ariaName: '剣属性',
    bg: '#e24a4a',
    border: '#b83232',
  },
  defense: {
    label: '盾',
    ariaName: '盾属性',
    bg: '#4488ff',
    border: '#2266cc',
  },
};

// 将来追加予定: 弓・両・癒・毒・氷・嵐・忍・力

export function getAttributeMeta(attribute: Attribute): AttributeMeta {
  return ATTRIBUTE_META[attribute];
}
