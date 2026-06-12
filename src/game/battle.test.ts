import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import {
  createBattleState,
  getBattleResult,
  getPromotableBackPositions,
} from './battleState';
import { promoteUnit, resolveTurn } from './resolveTurn';
import { pickCpuAction } from './cpu';

function stubCard(name: string, attr: 'attack' | 'defense', bp: number): Card {
  const grid = createEmptyGrid().map((row, i) =>
    row.map(() => (i === 0 ? '#ff0000' : null)),
  );
  const c = createCardFromDrawing(name, grid);
  return { ...c, attribute: attr, bp };
}

function cards(prefix: string): Card[] {
  return [
    stubCard(`${prefix}A`, 'attack', 80),
    stubCard(`${prefix}B`, 'attack', 70),
    stubCard(`${prefix}C`, 'attack', 60),
    stubCard(`${prefix}D`, 'defense', 50),
    stubCard(`${prefix}E`, 'attack', 40),
  ];
}

describe('battle', () => {
  it('前衛同士の近接攻撃を同時解決する', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(0);
    expect(state.cpu[0].currentBp).toBe(0);
    expect(state.player[0].position).toBe('defeated');
    expect(state.cpu[0].position).toBe('defeated');
    expect(getBattleResult(state)).toBe(null);
  });

  it('近接バトルでは仕掛けた側も相手BP分だけ減る', () => {
    let state = createBattleState(
      [
        stubCard('P90', 'attack', 90),
        ...cards('P').slice(1),
      ],
      [
        stubCard('C86', 'attack', 86),
        ...cards('C').slice(1),
      ],
    );
    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(47);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('一方的近接では反撃ダメージが50%になる', () => {
    let state = createBattleState(
      [stubCard('P90', 'attack', 90), ...cards('P').slice(1)],
      [stubCard('C86', 'attack', 86), ...cards('C').slice(1)],
    );
    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(47);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('相打ち近接では反撃ダメージが100%になる', () => {
    let state = createBattleState(
      [stubCard('P90', 'attack', 90), ...cards('P').slice(1)],
      [stubCard('C86', 'attack', 86), ...cards('C').slice(1)],
    );
    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(4);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('盾あり防御カードとの近接バトルでは盾側のBPは減らない', () => {
    let state = createBattleState(
      [
        stubCard('P90', 'attack', 90),
        ...cards('P').slice(1),
      ],
      [
        stubCard('C86', 'defense', 86),
        ...cards('C').slice(1),
      ],
    );
    state.cpu[0].hasShield = true;

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(47);
    expect(state.cpu[0].currentBp).toBe(86);
    expect(state.cpu[0].hasShield).toBe(false);
  });

  it('複数攻撃は攻撃側BPが高い順に処理する', () => {
    let state = createBattleState(
      [
        stubCard('A90', 'attack', 90),
        ...cards('P').slice(1),
      ],
      [
        stubCard('X40', 'attack', 40),
        stubCard('Y80', 'attack', 80),
        ...cards('C').slice(2),
      ],
    );

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontRight',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(0);
    expect(state.cpu[0].currentBp).toBe(0);
    expect(state.cpu[1].currentBp).toBe(45);
  });

  it('攻撃側BPが高い順により生存カードが変わる', () => {
    let state = createBattleState(
      [
        stubCard('A90', 'attack', 90),
        ...cards('P').slice(1),
      ],
      [
        stubCard('X88', 'attack', 88),
        stubCard('Y87', 'attack', 87),
        ...cards('C').slice(2),
      ],
    );

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontRight',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(0);
    expect(state.cpu[0].currentBp).toBe(0);
    expect(state.cpu[1].currentBp).toBe(64);
  });

  it('防御カードは開始時から盾を持つ', () => {
    const state = createBattleState(cards('P'), cards('C'));
    expect(state.player[3].position).toBe('backCenter');
    expect(state.player[3].hasShield).toBe(true);
  });

  it('同じターンに付与された盾が攻撃を防ぐ', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].hasShield = false;

    state = resolveTurn(state, {
      player: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].currentBp).toBe(80);
    expect(state.player[0].hasShield).toBe(false);
    expect(state.player[3].defenseShieldUsed).toBe(true);
  });

  it('盾付与は盾なしの味方1体にだけ行われる', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].hasShield = false;
    state.player[1].hasShield = false;

    const result = resolveTurn(state, {
      player: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontRight',
        targetPosition: 'frontRight',
      },
    });
    state = result.state;

    expect(result.shieldGrants.player.length).toBe(1);
    expect(state.player[0].hasShield).toBe(true);
    expect(state.player[1].hasShield).toBe(false);
  });

  it('防御カードは自分自身に盾を付与できない', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].attribute = 'defense';
    state.player[0].hasShield = false;

    state = resolveTurn(state, {
      player: {
        type: 'grantShield',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontRight',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[0].hasShield).toBe(false);
    expect(state.player[0].defenseShieldUsed).toBe(false);
  });

  it('盾持ちカードが攻撃すると自分の盾が壊れる', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].attribute = 'defense';
    state.player[0].hasShield = true;
    state.cpu[0].hasShield = false;

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[0].hasShield).toBe(false);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('盾同士の戦いでは両方の盾が消え、盾持ち側のBPは減らない', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].attribute = 'defense';
    state.cpu[0].attribute = 'defense';
    state.player[0].hasShield = true;
    state.cpu[0].hasShield = true;

    state = resolveTurn(state, {
      player: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.player[0].hasShield).toBe(false);
    expect(state.cpu[0].hasShield).toBe(false);
    expect(state.player[0].currentBp).toBe(80);
    expect(state.cpu[0].currentBp).toBe(80);
  });

  it('補充候補は左右の対応ルールに従う', () => {
    const state = createBattleState(cards('P'), cards('C'));
    expect(getPromotableBackPositions(state.player, 'frontLeft')).toEqual([
      'backLeft',
      'backCenter',
    ]);
    expect(getPromotableBackPositions(state.player, 'frontRight')).toEqual([
      'backCenter',
      'backRight',
    ]);
  });

  it('後衛を対応する空き前衛へ補充できる', () => {
    let state = createBattleState(cards('P'), cards('C'));
    state.player[0].position = 'defeated';
    state.player[0].currentBp = 0;

    state = promoteUnit(state, 'player', 'backLeft', 'frontLeft');
    expect(state.player[2].position).toBe('frontLeft');
  });

  it('CPUは実行可能な行動をランダム候補から選ぶ', () => {
    const state = createBattleState(cards('P'), cards('C'));
    const action = pickCpuAction(state, () => 0);
    expect(['meleeAttack', 'grantShield']).toContain(action.type);
  });
});
