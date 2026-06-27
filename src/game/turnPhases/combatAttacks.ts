import type {
  BattleActionChoice,
  BattleLogActionKind,
  BattleLogUnitSnapshot,
  BattleState,
  BattleUnit,
} from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { appendLog, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import type { AttackPlayback } from '../turnResult';
import { applyBowAttack, applyBowMutualStalemate, collectBowBattles } from './bowAttacks';
import { applyDualAttack, collectDualAttacks } from './dualAttacks';
import {
  applyMeleeBattle,
  battlePairKey,
  collectMeleeBattles,
  type MeleeBattleResolution,
} from './meleeAttacks';
import { applyStormAttack, collectStormAttacks } from './stormAttacks';

type AttackJob = {
  attacker: BattleUnit;
  target?: BattleUnit;
  actorSnap: BattleLogUnitSnapshot;
  targetSnap?: BattleLogUnitSnapshot;
  actionKind: BattleLogActionKind;
  run: () => AttackPlayback | null;
};

export interface CombatAttacksResult {
  state: BattleState;
  attacks: AttackPlayback[];
}

function pushAttackPreempted(
  state: BattleState,
  actorSnap: BattleLogUnitSnapshot,
  targetSnap: BattleLogUnitSnapshot | undefined,
  actionKind: BattleLogActionKind,
): BattleState {
  const turn = getDisplayTurn(state);
  const logLine = targetSnap
    ? `${actorSnap.name}は${targetSnap.name}を攻撃しようとしたが、その前に撃破された`
    : actionKind === 'storm'
      ? `${actorSnap.name}は嵐を発生しようとしたが、その前に撃破された`
      : `${actorSnap.name}は攻撃しようとしたが、その前に撃破された`;
  let next = appendLog(state, logLine);
  next = pushBattleEvent(next, {
    type: 'attack_preempted',
    turn,
    actor: actorSnap,
    target: targetSnap,
    actionKind,
  });
  return next;
}

function createAttackJob(
  attacker: BattleUnit,
  target: BattleUnit | undefined,
  actionKind: BattleLogActionKind,
  run: () => AttackPlayback | null,
): AttackJob {
  return {
    attacker,
    target,
    actorSnap: unitSnapshot(attacker, attacker.currentBp),
    targetSnap: target
      ? unitSnapshot(target, target.currentBp)
      : undefined,
    actionKind,
    run,
  };
}

export function resolveCombatAttacks(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
  random: () => number = Math.random,
): CombatAttacksResult {
  let next: BattleState = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };

  const bowBattles = [...collectBowBattles(choices, player, cpu).values()];
  const dualInputs = collectDualAttacks(choices, player, cpu);
  const stormInputs = collectStormAttacks(choices, player, cpu);
  const meleeBattles = [
    ...collectMeleeBattles(choices, player, cpu, state.turn + 1).values(),
  ];

  const dualPairKeys = new Set(
    dualInputs.map((input) =>
      battlePairKey(
        input.side,
        input.action.actorPosition,
        input.targetSide,
        input.action.targetPosition,
      ),
    ),
  );

  const resolvedMainPairs = new Set<string>();

  const jobs: AttackJob[] = [
    ...bowBattles.map((battle) =>
      createAttackJob(battle.attacker, battle.target, 'bow', () => {
        const result =
          battle.bidirectional &&
          battle.attacker.attribute === 'bow' &&
          battle.target.attribute === 'bow'
            ? applyBowMutualStalemate(next, player, cpu, battle)
            : applyBowAttack(next, player, cpu, battle);
        next = result.state;
        return result.playback;
      }),
    ),
    ...dualInputs.map((input) =>
      createAttackJob(input.attacker, input.target, 'dual_primary', () => {
        const result = applyDualAttack(
          next,
          player,
          cpu,
          input,
          choices,
          resolvedMainPairs,
        );
        next = result.state;
        return result.playback;
      }),
    ),
    ...stormInputs.map((input) =>
      createAttackJob(input.attacker, undefined, 'storm', () => {
        const result = applyStormAttack(next, player, cpu, input, random);
        next = result.state;
        return result.playback;
      }),
    ),
    ...meleeBattles
      .filter(
        (battle: MeleeBattleResolution) =>
          !dualPairKeys.has(
            battlePairKey(
              battle.side,
              battle.action.actorPosition,
              battle.targetSide,
              battle.action.targetPosition,
            ),
          ),
      )
      .map((battle: MeleeBattleResolution) =>
        createAttackJob(battle.attacker, battle.target, 'melee', () => {
          const result = applyMeleeBattle(next, player, cpu, battle);
          next = result.state;
          return result.playback;
        }),
      ),
  ];

  jobs.sort((a, b) => compareActionOrder(a.attacker, b.attacker));

  const attacks: AttackPlayback[] = [];
  for (const job of jobs) {
    if (!isAlive(job.attacker)) {
      if (job.targetSnap && job.target && isAlive(job.target)) {
        next = pushAttackPreempted(
          next,
          job.actorSnap,
          job.targetSnap,
          job.actionKind,
        );
      } else if (job.actionKind === 'storm') {
        next = pushAttackPreempted(
          next,
          job.actorSnap,
          undefined,
          job.actionKind,
        );
      }
      continue;
    }
    if (job.target && !isAlive(job.target)) {
      continue;
    }
    const playback = job.run();
    if (playback) attacks.push(playback);
  }

  return { state: next, attacks };
}
