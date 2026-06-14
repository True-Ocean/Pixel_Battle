import type { PixelGrid } from '../types';

/** 16×16 ピクセルアート用コイン色 */
const COIN = {
  rim: '#78350f',
  shadow: '#b45309',
  deep: '#d97706',
  body: '#f59e0b',
  bright: '#fbbf24',
  highlight: '#fde68a',
} as const;

type CoinCell = string | null;

function coinRow(...cells: CoinCell[]): CoinCell[] {
  if (cells.length !== 16) {
    throw new Error(`pixel coin row must be 16 cells wide, got ${cells.length}`);
  }
  return cells;
}

/** ヘッダー通貨アイコン用 16×16 コインドット絵 */
export const PIXEL_COIN_ICON_GRID: PixelGrid = [
  coinRow(
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ),
  coinRow(
    null, null, null, COIN.rim, COIN.rim, COIN.shadow, COIN.shadow, COIN.rim, COIN.rim, null, null, null, null, null, null, null,
  ),
  coinRow(
    null, null, COIN.rim, COIN.shadow, COIN.highlight, COIN.highlight, COIN.bright, COIN.bright, COIN.shadow, COIN.rim, null, null, null, null, null, null,
  ),
  coinRow(
    null, COIN.rim, COIN.shadow, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.shadow, COIN.rim, null, null, null, null,
  ),
  coinRow(
    null, COIN.rim, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.rim, null, null, null, null,
  ),
  coinRow(
    COIN.rim, COIN.shadow, COIN.body, COIN.body, COIN.body, COIN.highlight, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.shadow, COIN.rim, null, null,
  ),
  coinRow(
    COIN.rim, COIN.shadow, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.shadow, COIN.rim, null, null,
  ),
  coinRow(
    COIN.rim, COIN.shadow, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.shadow, COIN.rim, null, null,
  ),
  coinRow(
    COIN.rim, COIN.shadow, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.shadow, COIN.rim, null, null,
  ),
  coinRow(
    COIN.rim, COIN.shadow, COIN.body, COIN.body, COIN.body, COIN.highlight, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.shadow, COIN.rim, null, null,
  ),
  coinRow(
    null, COIN.rim, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.rim, null, null, null, null,
  ),
  coinRow(
    null, COIN.rim, COIN.shadow, COIN.bright, COIN.body, COIN.body, COIN.body, COIN.body, COIN.body, COIN.bright, COIN.shadow, COIN.rim, null, null, null, null,
  ),
  coinRow(
    null, null, COIN.rim, COIN.shadow, COIN.highlight, COIN.highlight, COIN.bright, COIN.bright, COIN.shadow, COIN.rim, null, null, null, null, null, null,
  ),
  coinRow(
    null, null, null, COIN.rim, COIN.rim, COIN.shadow, COIN.shadow, COIN.rim, COIN.rim, null, null, null, null, null, null, null,
  ),
  coinRow(
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ),
  coinRow(
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ),
];
