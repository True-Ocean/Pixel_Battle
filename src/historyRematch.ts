import { computeDeckPower } from './card';
import type { Card } from './types';

/**
 * 履歴再戦・公開デッキ戦用。
 * 相手デッキの構成（絵・属性・レア等）は維持し、BP のみプレイヤー出撃デッキの戦力に合わせて比率スケールする。
 * 戦力の厳密一致は求めない（丸め・属性構成差は許容）。
 */
export function prepareHistoryOpponentDeck(
  opponentDeck: Card[],
  playerDeck: readonly Card[],
): Card[] {
  const deck = structuredClone(opponentDeck) as Card[];
  const targetPower = computeDeckPower(playerDeck);
  const currentPower = computeDeckPower(deck);
  if (currentPower <= 0 || targetPower <= 0 || currentPower === targetPower) {
    return deck;
  }

  const ratio = targetPower / currentPower;
  return deck.map((card) => ({
    ...card,
    bp: Math.max(1, Math.round(card.bp * ratio)),
  }));
}
