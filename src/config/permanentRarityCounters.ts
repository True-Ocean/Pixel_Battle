import type { PermanentCounterSpec } from './permanentMissions';
import type { CardRarity } from '../types';

/** 将来レア度追加時はここに行を足す */
export const PERMANENT_RARITY_COUNTER_SPECS: readonly PermanentCounterSpec[] = [
  {
    eventType: 'rarity_owned',
    idPrefix: 'permanent_own_rarity_r',
    goalStep: 1,
    title: (goal) => `Rカード${goal}枚`,
    description: (goal) => `Rカードを${goal}枚所持する`,
    rewardForGoal: () => ({ px: 10 }),
  },
  {
    eventType: 'deck_win_with_rarity',
    idPrefix: 'permanent_win_with_rarity_r',
    goalStep: 1,
    title: (goal) => `R${goal}枚デッキ勝利`,
    description: (goal) => `Rカードを${goal}枚含むデッキで勝利する`,
    rewardForGoal: () => ({ px: 20 }),
  },
  {
    eventType: 'rarity_owned',
    idPrefix: 'permanent_own_rarity_sr',
    goalStep: 1,
    title: (goal) => `SRカード${goal}枚`,
    description: (goal) => `SRカードを${goal}枚所持する`,
    rewardForGoal: () => ({ jewels: 5 }),
  },
  {
    eventType: 'deck_win_with_rarity',
    idPrefix: 'permanent_win_with_rarity_sr',
    goalStep: 1,
    title: (goal) => `SR${goal}枚デッキ勝利`,
    description: (goal) => `SRカードを${goal}枚含むデッキで勝利する`,
    rewardForGoal: () => ({ jewels: 10 }),
  },
];

const RARITY_BY_OWNERSHIP_PREFIX: Record<string, CardRarity> = {
  permanent_own_rarity_r: 'R',
  permanent_own_rarity_sr: 'SR',
};

const RARITY_BY_DECK_WIN_PREFIX: Record<string, CardRarity> = {
  permanent_win_with_rarity_r: 'R',
  permanent_win_with_rarity_sr: 'SR',
};

export function getRarityForOwnershipCounterPrefix(
  idPrefix: string,
): CardRarity | undefined {
  return RARITY_BY_OWNERSHIP_PREFIX[idPrefix];
}

export function getRarityForDeckWinCounterPrefix(
  idPrefix: string,
): CardRarity | undefined {
  return RARITY_BY_DECK_WIN_PREFIX[idPrefix];
}
