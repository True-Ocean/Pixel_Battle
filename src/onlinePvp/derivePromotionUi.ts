import {
  getPendingPromotionFronts,
  getPromotableBackPositions,
} from '../game/battleState';
import type { BattleState, BoardPosition } from '../types/battle';
import { onlinePromotionNeeded } from './onlineBattleAuthority';
import type { OnlineBattlePhase } from './types';

export type PromotionUiMode =
  | 'idle'
  | 'pickBack'
  | 'pickFront'
  | 'waitOpponent';

export interface PromotionDraft {
  from: BoardPosition | null;
}

export interface DerivedPromotionUi {
  mode: PromotionUiMode;
  validBacks: BoardPosition[];
  validFronts: BoardPosition[];
  hint: string | null;
  autoSubmit: { from: BoardPosition; to: BoardPosition } | null;
}

export function validFrontsForBack(
  field: BattleState['player'],
  from: BoardPosition,
): BoardPosition[] {
  return getPendingPromotionFronts(field).filter((front) =>
    getPromotableBackPositions(field, front).includes(from),
  );
}

export function allPromotableBacks(
  field: BattleState['player'],
): BoardPosition[] {
  const backs = getPendingPromotionFronts(field).flatMap((front) =>
    getPromotableBackPositions(field, front),
  );
  return [...new Set(backs)];
}

function findForcedPromotion(
  field: BattleState['player'],
): { from: BoardPosition; to: BoardPosition } | null {
  const forced = getPendingPromotionFronts(field)
    .map((front) => ({
      front,
      backs: getPromotableBackPositions(field, front),
    }))
    .find(({ backs }) => backs.length === 1);
  if (!forced) return null;
  return { from: forced.backs[0]!, to: forced.front };
}

export function derivePromotionUi(
  state: BattleState,
  battlePhase: OnlineBattlePhase | undefined,
  draft: PromotionDraft,
): DerivedPromotionUi {
  const idle: DerivedPromotionUi = {
    mode: 'idle',
    validBacks: [],
    validFronts: [],
    hint: null,
    autoSubmit: null,
  };

  const playerFronts = getPendingPromotionFronts(state.player);
  const opponentNeeds = getPendingPromotionFronts(state.cpu).length > 0;

  if (playerFronts.length === 0) {
    const waitForOpponent =
      opponentNeeds &&
      (battlePhase === 'promotion' ||
        battlePhase === 'turn_start' ||
        (battlePhase === 'select' && onlinePromotionNeeded(state)));
    if (waitForOpponent) {
      return {
        mode: 'waitOpponent',
        validBacks: [],
        validFronts: [],
        hint: '相手の前衛補充を待っています…',
        autoSubmit: null,
      };
    }
    return idle;
  }

  const validBacks = allPromotableBacks(state.player);

  if (!draft.from) {
    const forced = findForcedPromotion(state.player);
    if (forced) {
      return {
        mode: 'pickBack',
        validBacks,
        validFronts: [forced.to],
        hint: '前衛に移動する後衛カードを選択',
        autoSubmit: forced,
      };
    }
    return {
      mode: 'pickBack',
      validBacks,
      validFronts: [],
      hint: '前衛に移動する後衛カードを選択',
      autoSubmit: null,
    };
  }

  const validFronts = validFrontsForBack(state.player, draft.from);
  if (validFronts.length === 0) {
    return {
      mode: 'pickBack',
      validBacks,
      validFronts: [],
      hint: '前衛に移動する後衛カードを選択',
      autoSubmit: null,
    };
  }

  if (validFronts.length === 1) {
    return {
      mode: 'pickFront',
      validBacks,
      validFronts,
      hint: '移動先の前衛スロットを選択',
      autoSubmit: { from: draft.from, to: validFronts[0]! },
    };
  }

  return {
    mode: 'pickFront',
    validBacks,
    validFronts,
    hint: '移動先の前衛スロットを選択',
    autoSubmit: null,
  };
}

export function promotionModeToUiPhase(
  mode: PromotionUiMode,
): 'promoteUnit' | 'promoteSlot' | 'waitOpponentPromotion' | null {
  switch (mode) {
    case 'pickBack':
      return 'promoteUnit';
    case 'pickFront':
      return 'promoteSlot';
    case 'waitOpponent':
      return 'waitOpponentPromotion';
    default:
      return null;
  }
}
