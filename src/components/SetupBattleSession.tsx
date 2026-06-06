import { useEffect, type RefObject } from 'react';
import type { Card } from '../types';
import { SetupBoardBattle } from './SetupBoardBattle';
import { useBattle } from './useBattle';

interface SetupBattleSessionProps {
  playerCards: Card[];
  cpuCards: Card[];
  boardRef: RefObject<HTMLDivElement | null>;
  onFinish: (outcome: {
    winner: 'player' | 'cpu';
    playerCardIds: string[];
    fauxLostCardId: string | null;
  }) => void;
  onEndedChange?: (ended: boolean, persistOutcome: () => void) => void;
}

export function SetupBattleSession({
  playerCards,
  cpuCards,
  boardRef,
  onFinish,
  onEndedChange,
}: SetupBattleSessionProps) {
  const battle = useBattle(playerCards, cpuCards, onFinish);
  const ended =
    battle.effectivePhase === 'ended' && battle.result != null;

  useEffect(() => {
    onEndedChange?.(ended, battle.handleEnd);
  }, [ended, battle.handleEnd, onEndedChange]);

  return (
    <>
      <SetupBoardBattle battle={battle} boardRef={boardRef} />
      {battle.effectivePhase !== 'ended' && battle.hint && (
        <p className="battle-hint setup-battle-hint">{battle.hint}</p>
      )}
      {battle.effectivePhase === 'pickShield' && (
        <button
          type="button"
          className="battle-cancel setup-battle-cancel"
          onClick={battle.cancelShieldPick}
        >
          出撃カードの選び直し
        </button>
      )}
    </>
  );
}
