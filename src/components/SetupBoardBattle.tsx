import type { RefObject } from 'react';
import { BattleBoard } from './BattleBoard';
import type { useBattle } from './useBattle';

type BattleController = ReturnType<typeof useBattle>;

interface SetupBoardBattleProps {
  battle: BattleController;
  boardRef: RefObject<HTMLDivElement | null>;
}

/** 同一 setup-board 内：Aライン位置に3枚、Bライン位置にフィールド */
export function SetupBoardBattle({ battle, boardRef }: SetupBoardBattleProps) {
  const ended = battle.effectivePhase === 'ended' && battle.result != null;

  return (
    <BattleBoard
      layout="setup"
      boardRef={boardRef}
      state={battle.state}
      playerCards={battle.playerCards}
      cpuCards={battle.cpuCards}
      playerAlive={battle.playerAlive}
      clash={ended ? null : battle.clash}
      pendingMain={
        ended
          ? null
          : battle.effectivePhase === 'pickShield'
            ? battle.pendingMain
            : null
      }
      focusedPlayer={
        ended
          ? null
          : battle.effectivePhase === 'pickMain' &&
              battle.playerAlive.length === 1
            ? battle.playerAlive[0]
            : battle.pendingMain
      }
      phase={ended ? 'ended' : battle.effectivePhase}
      battleResult={ended ? battle.result : null}
      onPlayerClick={
        ended ? () => {} : battle.handlePlayerCardClick
      }
    />
  );
}
