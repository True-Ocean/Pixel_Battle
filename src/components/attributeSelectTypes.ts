import type { Attribute } from '../types';

export interface AttributeSelectSuccess {
  attribute: Attribute;
  previousBp: number;
  newBp: number;
  previousJewels: number;
  nextJewels: number;
}

export type AttributeSelectOutcome = AttributeSelectSuccess | string;
