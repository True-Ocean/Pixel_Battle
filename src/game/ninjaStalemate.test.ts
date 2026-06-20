import { describe, expect, it } from 'vitest';
import type { Attribute, Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import { createBattleState } from './battleState';
import {
  enumerateBattleActionChoices,
  hasBattleActionChoices,
} from './actionChoices';
import { formatBattleLog } from './formatBattleLog';
import {
  formatStealthMutualBreakLogLine,
  isNinjaStealthStalemate,
  resolveNinjaStealthStalemate,
} from './ninjaStalemate';

function stubCard(name: string, attr: Attribute, bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

function defeatAllExceptFrontLeft(state: ReturnType<typeof createBattleState>) {
  for (const field of [state.player, state.cpu]) {
    for (const unit of field) {
      if (unit.position !== 'frontLeft') {
        unit.position = 'defeated';
        unit.currentBp = 0;
      }
    }
  }
}

function frontNinjaStalemateState() {
  const playerDeck = [
    stubCard('忍A', 'ninja', 200),
    stubCard('P2', 'attack', 50),
    stubCard('P3', 'attack', 50),
    stubCard('P4', 'attack', 50),
    stubCard('P5', 'attack', 50),
  ];
  const cpuDeck = [
    stubCard('忍B', 'ninja', 210),
    stubCard('C2', 'attack', 50),
    stubCard('C3', 'attack', 50),
    stubCard('C4', 'attack', 50),
    stubCard('C5', 'attack', 50),
  ];
  const state = createBattleState(playerDeck, cpuDeck);
  defeatAllExceptFrontLeft(state);
  return state;
}

describe('ninjaStalemate', () => {
  it('前衛ステルス忍び同士で双方行動不能なら膠着と判定する', () => {
    const state = frontNinjaStalemateState();
    expect(hasBattleActionChoices(state, 'player')).toBe(false);
    expect(hasBattleActionChoices(state, 'cpu')).toBe(false);
    expect(isNinjaStealthStalemate(state)).toBe(true);
  });

  it('片方に行動候補があれば膠着ではない', () => {
    const state = frontNinjaStalemateState();
    state.player[2]!.position = 'backLeft';
    state.player[2]!.currentBp = 80;
    state.player[2]!.attribute = 'storm';
    state.player[2]!.stormUsesRemaining = 1;
    expect(hasBattleActionChoices(state, 'player')).toBe(true);
    expect(isNinjaStealthStalemate(state)).toBe(false);
  });

  it('互いにステルス解除してターンを進め、次は近接可能になる', () => {
    const state = frontNinjaStalemateState();
    const turnBefore = state.turn;

    const { state: next, logLine } = resolveNinjaStealthStalemate(state);

    expect(next.turn).toBe(turnBefore + 1);
    expect(next.player[0]!.stealthActive).toBe(false);
    expect(next.cpu[0]!.stealthActive).toBe(false);
    expect(next.player[0]!.ninjaFirstStrikeUsed).toBe(true);
    expect(next.cpu[0]!.ninjaFirstStrikeUsed).toBe(true);
    expect(logLine).toBe(
      formatStealthMutualBreakLogLine(state.player[0]!, state.cpu[0]!),
    );
    expect(hasBattleActionChoices(next, 'player')).toBe(true);
    expect(hasBattleActionChoices(next, 'cpu')).toBe(true);
    expect(enumerateBattleActionChoices(next, 'player').some(
      (c) => c.type === 'meleeAttack',
    )).toBe(true);
  });

  it('formatBattleLog でステルス相互解除を整形できる', () => {
    const state = frontNinjaStalemateState();
    const { state: next } = resolveNinjaStealthStalemate(state);
    const breakEvent = next.events.find((e) => e.type === 'stealth_mutual_break');
    expect(breakEvent).toBeDefined();

    const groups = formatBattleLog([
      { type: 'turn_start', turn: 1 },
      breakEvent!,
    ]);
    expect(groups[0]?.lines[0]).toBe(
      '忍A（忍・BP200）と忍B（忍・BP210）は互いにステルスを解除した',
    );
  });
});
