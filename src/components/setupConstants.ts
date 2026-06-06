import { DECK_MAX, FIELD_SIZE } from '../config/balance';

/** こちらから見て相手手札の左端＝デッキ置き場 */
export const CPU_DECK_HAND_INDEX = 0;

/** 自分手札の右端＝デッキ置き場 */
export const PLAYER_DECK_HAND_INDEX = DECK_MAX - 1;

/** 5枚手札行の中央3枠（デプロイ先） */
export const HAND_DEPLOY_START = Math.floor((DECK_MAX - FIELD_SIZE) / 2);

export function handDeploySlotIndex(pickIndex: number): number {
  return HAND_DEPLOY_START + pickIndex;
}

export const SETUP_MS = {
  reveal: 5000,
  gather: 380,
  shuffle: 480,
  dealCardMove: 260,
  dealFlipReveal: 120,
  dealStepGap: 65,
  pickFlight: 260,
  cpuPick: 280,
  deployHandFade: 260,
  deploySlide: 360,
  deployFieldOpen: 360,
} as const;
