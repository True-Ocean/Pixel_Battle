import type { ScreenId } from '../types';

/** Dock に表示するメインタブ */
export type TabId = 'deck' | 'mission' | 'battleHub' | 'shop' | 'inventory';

export const TAB_IDS: TabId[] = [
  'deck',
  'mission',
  'battleHub',
  'shop',
  'inventory',
];

export function isTabId(screen: ScreenId): screen is TabId {
  return TAB_IDS.includes(screen as TabId);
}

/** 画面下部 Dock を表示する画面か */
export function isDockVisible(screen: ScreenId): boolean {
  return isTabId(screen);
}
