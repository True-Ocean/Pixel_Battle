import { rescaleDeckBp } from './card';
import type { Card } from './types';

/** 履歴の相手デッキ構成を維持し、BP のみ現在のユーザーレベルで再計算する */
export function prepareHistoryOpponentDeck(
  opponentDeck: Card[],
  userLevel: number,
): Card[] {
  return rescaleDeckBp(structuredClone(opponentDeck), userLevel);
}
