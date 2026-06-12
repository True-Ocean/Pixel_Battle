import { describe, expect, it } from 'vitest';
import type { Attribute, Card } from '../types';
import { createCardFromDrawing } from '../card';
import { createEmptyGrid } from '../canvas';
import {
  createBattleState,
  getBattleResult,
  getPromotableBackPositions,
} from './battleState';
import { getActionTypesForUnit } from './actions/getActionTypesForUnit';
import { getHealTargets } from './healCombat';
import { promoteUnit, resolveTurn } from './resolveTurn';
import { startNextTurn } from './startNextTurn';
import { pickCpuAction } from './cpu';

function stubCard(name: string, attr: Attribute, bp: number): Card {
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

  it('後衛弓は敵前衛に100%ダメージで反撃されない', () => {
    const playerDeck = [
      stubCard('P1', 'attack', 50),
      stubCard('P2', 'attack', 50),
      stubCard('弓', 'bow', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state = resolveTurn(state, {
      player: {
        type: 'bowAttack',
        actorPosition: 'backLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.player[2].currentBp).toBe(80);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('弓は敵後衛に100%ダメージで反撃されない', () => {
    const playerDeck = [
      stubCard('P1', 'attack', 50),
      stubCard('P2', 'attack', 50),
      stubCard('弓', 'bow', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state = resolveTurn(state, {
      player: {
        type: 'bowAttack',
        actorPosition: 'backLeft',
        targetPosition: 'backLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.cpu[2].currentBp).toBe(0);
    expect(state.player[2].currentBp).toBe(80);
  });

  it('弓は1戦闘2矢までで矢切れ後は後衛では行動できない', () => {
    const playerDeck = [
      stubCard('P1', 'attack', 50),
      stubCard('P2', 'attack', 50),
      stubCard('弓', 'bow', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const bowChoice = {
      type: 'bowAttack' as const,
      actorPosition: 'backLeft' as const,
      targetPosition: 'frontLeft' as const,
    };
    const cpuPass = {
      type: 'grantShield' as const,
      actorPosition: 'backCenter' as const,
      targetPosition: 'frontLeft' as const,
    };

    state = resolveTurn(state, { player: bowChoice, cpu: cpuPass }).state;
    expect(state.player.find((u) => u.attribute === 'bow')!.bowArrowsRemaining).toBe(
      1,
    );
    state = resolveTurn(state, { player: bowChoice, cpu: cpuPass }).state;
    expect(state.player.find((u) => u.attribute === 'bow')!.bowArrowsRemaining).toBe(
      0,
    );

    const bow = state.player.find((u) => u.attribute === 'bow')!;
    expect(getActionTypesForUnit(state.player, state.cpu, bow.position)).toEqual([]);
  });

  it('弓は矢切れ後も前衛なら近接攻撃できる', () => {
    const playerDeck = [
      stubCard('弓', 'bow', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const bow = state.player.find((u) => u.attribute === 'bow')!;
    bow.bowArrowsRemaining = 0;
    bow.position = 'frontLeft';
    state.cpu[0].currentBp = 100;

    expect(getActionTypesForUnit(state.player, state.cpu, 'frontLeft')).toEqual([
      'meleeAttack',
    ]);

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

    expect(state.cpu[0].currentBp).toBe(20);
    expect(state.player[0].currentBp).toBe(30);
  });

  it('前衛弓は敵前衛に100%ダメージで反撃されない', () => {
    const playerDeck = [
      stubCard('弓', 'bow', 60),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;

    state = resolveTurn(state, {
      player: {
        type: 'bowAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
    }).state;

    expect(state.cpu[0].currentBp).toBe(40);
    expect(state.player[0].currentBp).toBe(60);
  });

  it('両攻撃は主対象へ近接＋副前衛へ50%無反撃', () => {
    const playerDeck = [
      stubCard('両', 'dual', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;
    state.cpu[1].currentBp = 50;

    state = resolveTurn(state, {
      player: {
        type: 'dualAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'backLeft',
      },
    }).state;

    expect(state.cpu[1].currentBp).toBe(0);
    expect(state.cpu[0].currentBp).toBe(60);
    expect(state.player[0].currentBp).toBe(55);
  });

  it('両の副攻撃は盾で防げる', () => {
    const playerDeck = [
      stubCard('両', 'dual', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;
    state.cpu[0].hasShield = true;
    state.cpu[1].currentBp = 50;

    state = resolveTurn(state, {
      player: {
        type: 'dualAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'backLeft',
      },
    }).state;

    expect(state.cpu[0].hasShield).toBe(false);
    expect(state.cpu[0].currentBp).toBe(100);
    expect(state.cpu[1].currentBp).toBe(0);
  });

  it('毒属性は一方的な反撃でも攻撃側に毒を付与する', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));

    state = resolveTurn(state, {
      player: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    }).state;

    expect(state.cpu[0].poisonStacks).toHaveLength(1);
    expect(state.cpu[0].poisonStacks[0]!.damagePerTurn).toBe(24);
    expect(state.player[0].currentBp).toBe(0);
    expect(state.cpu[0].currentBp).toBe(40);
  });

  it('盾があると毒の付与も防がれ盾は消える', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;
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

    expect(state.cpu[0].hasShield).toBe(false);
    expect(state.cpu[0].currentBp).toBe(100);
    expect(state.cpu[0].poisonStacks).toHaveLength(0);
  });

  it('盾があると一方的反撃の毒付与も防がれる', () => {
    const playerDeck = [
      stubCard('P1', 'attack', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    const cpuDeck = [
      stubCard('毒', 'poison', 80),
      ...cards('C').slice(1),
    ];
    let state = createBattleState(playerDeck, cpuDeck);
    state.player[0].hasShield = true;
    state.player[0].currentBp = 100;

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
    expect(state.player[0].poisonStacks).toHaveLength(0);
  });

  it('毒属性の近接で主対象にスタックを付与する', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;

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

    expect(state.cpu[0].poisonStacks).toHaveLength(1);
    expect(state.cpu[0].poisonStacks[0]!.damagePerTurn).toBe(24);
  });

  it('毒DoTは次ターン開始時に適用される', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;

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
    expect(state.cpu[0].currentBp).toBe(20);

    state = startNextTurn(state).stateAfterDot;

    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('毒スタックは付与者が撃破されても継続する', () => {
    const playerDeck = [
      stubCard('毒', 'poison', 80),
      stubCard('P2', 'attack', 50),
      stubCard('P3', 'attack', 50),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.cpu[0].currentBp = 100;

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

    state.player[0].position = 'defeated';
    state.player[0].currentBp = 0;

    state = startNextTurn(state).stateAfterDot;

    expect(state.cpu[0].poisonStacks).toHaveLength(1);
    expect(state.cpu[0].currentBp).toBe(0);
  });

  it('癒は回復と同時に対象の毒を解消する', () => {
    const playerDeck = [
      stubCard('PFront', 'attack', 100),
      stubCard('PWounded', 'attack', 80),
      stubCard('PBackL', 'attack', 60),
      stubCard('Healer', 'heal', 50),
      stubCard('PBackR', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const wounded = state.player.find((u) => u.position === 'frontRight')!;
    wounded.currentBp = 30;
    wounded.poisonStacks = [{ sourceCardId: 'poison-1', damagePerTurn: 12 }];
    wounded.poisonDotDamageReceived = true;

    const result = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
    });

    expect(result.heals[0]?.poisonStacksCleared).toBe(1);
    const healed = result.state.player.find((u) => u.position === 'frontRight')!;
    expect(healed.poisonStacks).toHaveLength(0);
    expect(healed.currentBp).toBe(80);
  });

  it('癒はBP満タンでも毒だけ解消できる', () => {
    const playerDeck = [
      stubCard('PFront', 'attack', 100),
      stubCard('Poisoned', 'attack', 80),
      stubCard('PBackL', 'attack', 60),
      stubCard('Healer', 'heal', 50),
      stubCard('PBackR', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const poisoned = state.player.find((u) => u.position === 'frontRight')!;
    poisoned.poisonStacks = [{ sourceCardId: 'poison-1', damagePerTurn: 12 }];
    poisoned.poisonDotDamageReceived = true;

    const result = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'grantShield',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
    });

    expect(result.heals[0]?.amount).toBe(0);
    expect(result.heals[0]?.poisonStacksCleared).toBe(1);
    expect(
      result.state.player.find((u) => u.position === 'frontRight')!.poisonStacks,
    ).toHaveLength(0);
  });

  it('毒付与直後は回復できず、毒DoT後に回復できる', () => {
    const playerDeck = [
      stubCard('PFront', 'attack', 100),
      stubCard('Poisoned', 'attack', 80),
      stubCard('PBackL', 'attack', 60),
      stubCard('Healer', 'heal', 50),
      stubCard('PBackR', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const poisoned = state.player.find((u) => u.position === 'frontRight')!;
    poisoned.poisonStacks = [{ sourceCardId: 'poison-1', damagePerTurn: 12 }];

    expect(getHealTargets(state.player, 'backCenter')).not.toContain('frontRight');

    state = startNextTurn(state).stateAfterDot;
    expect(getHealTargets(state.player, 'backCenter')).toContain('frontRight');
    expect(
      state.player.find((u) => u.position === 'frontRight')!.poisonDotDamageReceived,
    ).toBe(true);
  });

  it('癒は盾・攻撃より先に味方を回復する', () => {
    const playerDeck = [
      stubCard('PFront', 'attack', 100),
      stubCard('PWounded', 'attack', 80),
      stubCard('PBackL', 'attack', 60),
      stubCard('Healer', 'heal', 50),
      stubCard('PBackR', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    const wounded = state.player.find((u) => u.position === 'frontRight')!;
    wounded.currentBp = 30;

    const result = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
      cpu: {
        type: 'meleeAttack',
        actorPosition: 'frontLeft',
        targetPosition: 'frontLeft',
      },
    });

    expect(result.heals).toHaveLength(1);
    expect(result.heals[0]).toMatchObject({
      side: 'player',
      amount: 50,
      bpFrom: 30,
      bpTo: 80,
    });
    const healed = result.state.player.find((u) => u.position === 'frontRight')!;
    expect(healed.currentBp).toBe(80);
    const healer = result.state.player.find((u) => u.position === 'backCenter')!;
    expect(healer.healUsesRemaining).toBe(1);
  });

  it('癒の回復回数は1戦闘2回まで', () => {
    const playerDeck = [
      stubCard('PW1', 'attack', 80),
      stubCard('PW2', 'attack', 80),
      stubCard('P3', 'attack', 60),
      stubCard('Healer', 'heal', 40),
      stubCard('P5', 'attack', 40),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.player.find((u) => u.position === 'frontLeft')!.currentBp = 50;
    state.player.find((u) => u.position === 'frontRight')!.currentBp = 60;

    const cpuPass = {
      type: 'grantShield' as const,
      actorPosition: 'backCenter' as const,
      targetPosition: 'frontLeft' as const,
    };

    state = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
      cpu: cpuPass,
    }).state;
    state = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontRight',
      },
      cpu: cpuPass,
    }).state;
    const healer = state.player.find((u) => u.position === 'backCenter')!;
    expect(healer.healUsesRemaining).toBe(0);

    const before = state.player.find((u) => u.position === 'frontLeft')!.currentBp;
    state = resolveTurn(state, {
      player: {
        type: 'heal',
        actorPosition: 'backCenter',
        targetPosition: 'frontLeft',
      },
      cpu: cpuPass,
    }).state;
    const after = state.player.find((u) => u.position === 'frontLeft')!.currentBp;
    expect(after).toBe(before);
  });

  it('弓が前衛に補充されてもBPは半減しない', () => {
    const playerDeck = [
      stubCard('P1', 'attack', 50),
      stubCard('P2', 'attack', 50),
      stubCard('弓', 'bow', 80),
      stubCard('P4', 'attack', 50),
      stubCard('P5', 'attack', 50),
    ];
    let state = createBattleState(playerDeck, cards('C'));
    state.player[0].position = 'defeated';
    state.player[0].currentBp = 0;

    state = promoteUnit(state, 'player', 'backLeft', 'frontLeft');
    const bow = state.player.find((u) => u.name === '弓');
    expect(bow?.position).toBe('frontLeft');
    expect(bow?.currentBp).toBe(80);
    expect(bow?.maxBp).toBe(80);
  });

});
