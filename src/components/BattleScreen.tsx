import type { Card, BattleOutcome } from '../types';
import { BattleBoard } from './BattleBoard';
import { useBattle } from './useBattle';

interface BattleScreenProps {
  playerCards: Card[];
  cpuCards: Card[];
  onFinish: (result: BattleOutcome) => void;
}

/** 準備を経由しない直接戦闘用（通常は SetupBattleSession を使用） */
export function BattleScreen({
  playerCards,
  cpuCards,
  onFinish,
}: BattleScreenProps) {
  const battle = useBattle(playerCards, cpuCards, onFinish);
  const ended = battle.effectivePhase === 'ended' && battle.result != null;

  return (
    <section className="screen battle-screen">
      <div className="battle-header">
        <h1>戦闘</h1>
        <p className="muted">ターン {battle.state.turn + 1}</p>
        {battle.hint && <p className="battle-hint">{battle.hint}</p>}
      </div>

      <BattleBoard
        layout="standalone"
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

      {!ended && battle.effectivePhase === 'pickShield' && (
        <button
          type="button"
          className="battle-cancel"
          onClick={battle.cancelShieldPick}
        >
          出撃カードの選び直し
        </button>
      )}
    </section>
  );
}
