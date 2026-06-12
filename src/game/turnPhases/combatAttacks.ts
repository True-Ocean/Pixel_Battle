import type { BattleActionChoice, BattleState, BattleUnit } from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { isAlive } from '../battleState';
import type { AttackPlayback } from '../turnResult';
import { applyBowAttack, collectBowAttacks } from './bowAttacks';
import { applyDualAttack, collectDualAttacks } from './dualAttacks';
import {
  applyMeleeBattle,
  battlePairKey,
  collectMeleeBattles,
  type MeleeBattleResolution,
} from './meleeAttacks';

type AttackJob =
  | { kind: 'bow'; attacker: BattleUnit; run: () => AttackPlayback | null }
  | { kind: 'dual'; attacker: BattleUnit; run: () => AttackPlayback | null }
  | { kind: 'melee'; attacker: BattleUnit; run: () => AttackPlayback | null };

export interface CombatAttacksResult {
  state: BattleState;
  attacks: AttackPlayback[];
}

export function resolveCombatAttacks(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): CombatAttacksResult {
  let next: BattleState = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };

  const bowInputs = collectBowAttacks(choices, player, cpu);
  const dualInputs = collectDualAttacks(choices, player, cpu);
  const meleeBattles = [...collectMeleeBattles(choices, player, cpu).values()];

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
    ...bowInputs.map((input) => ({
      kind: 'bow' as const,
      attacker: input.attacker,
      run: () => {
        if (!isAlive(input.attacker) || !isAlive(input.target)) return null;
        const result = applyBowAttack(next, player, cpu, input);
        next = result.state;
        return result.playback;
      },
    })),
    ...dualInputs.map((input) => ({
      kind: 'dual' as const,
      attacker: input.attacker,
      run: () => {
        if (!isAlive(input.attacker) || !isAlive(input.target)) return null;
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
      },
    })),
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
      .map((battle: MeleeBattleResolution) => ({
        kind: 'melee' as const,
        attacker: battle.attacker,
        run: () => {
          if (!isAlive(battle.attacker) || !isAlive(battle.target)) return null;
          const result = applyMeleeBattle(next, player, cpu, battle);
          next = result.state;
          return result.playback;
        },
      })),
  ];

  jobs.sort((a, b) => compareActionOrder(a.attacker, b.attacker));

  const attacks: AttackPlayback[] = [];
  for (const job of jobs) {
    const playback = job.run();
    if (playback) attacks.push(playback);
  }

  return { state: next, attacks };
}
