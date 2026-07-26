import type { Attribute } from '../types';
import type { AttributeGachaPulls } from '../card';

export interface AttributeGachaStartSuccess {
  pulls: AttributeGachaPulls;
  rolls: Attribute[];
  previousAttribute: Attribute;
  previousBp: number;
  previousFreePixels: number;
  nextFreePixels: number;
  /** 期間限定ガチャなど 💎 支払い時 */
  previousJewels?: number;
  nextJewels?: number;
  currency?: 'px' | 'jewel';
}

export type AttributeGachaStartOutcome =
  | AttributeGachaStartSuccess
  | { error: import('react').ReactNode };

export interface AttributeGachaResolveSuccess {
  /** null = 現状維持（属性変更なし） */
  attribute: Attribute | null;
  previousAttribute: Attribute;
  previousBp: number;
  newBp: number;
  previousFreePixels: number;
  nextFreePixels: number;
  previousJewels?: number;
  nextJewels?: number;
  shardsGranted: Partial<Record<Attribute, number>>;
}

export type AttributeGachaResolveOutcome =
  | AttributeGachaResolveSuccess
  | { error: string };

export interface AttributeGachaConfirmSuccess {
  attribute: Attribute;
  previousBp: number;
  newBp: number;
  previousJewels: number;
  nextJewels: number;
}

export type AttributeGachaConfirmOutcome = AttributeGachaConfirmSuccess | string;
