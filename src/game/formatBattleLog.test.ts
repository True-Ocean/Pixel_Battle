import { describe, expect, it } from 'vitest';
import { formatBattleLog } from './formatBattleLog';
import type { BattleEvent } from '../types/battle';

describe('formatBattleLog', () => {
  it('近接攻撃は与ダメージと被ダメージを明示する', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '毒スライム', attribute: 'poison', bp: 80, bpAfter: 65 },
        target: { name: '氷ゴブリン', attribute: 'ice', bp: 60, bpAfter: 40 },
        damageToTarget: 20,
        damageToActor: 15,
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toBe(
      '毒スライム（毒・BP80）が 氷ゴブリン（氷・BP60）に近接攻撃 → 氷ゴブリンに20ダメージを与え、毒スライムは15ダメージを受けた',
    );
  });

  it('近接で盾を防いだ場合は攻撃ログに盾破壊を含め別行は出さない', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '剣士', attribute: 'attack', bp: 90, bpAfter: 47 },
        target: { name: '盾兵', attribute: 'defense', bp: 86 },
        damageToTarget: 0,
        damageToActor: 43,
        targetShieldBroken: true,
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines).toHaveLength(1);
    expect(groups[0].lines[0]).toBe(
      '剣士（剣・BP90）が 盾兵（盾・BP86）に近接攻撃 → 盾兵の盾が破壊された、剣士は43ダメージを受けた',
    );
  });

  it('近接攻撃側の盾が壊れた場合も攻撃ログに含める', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '盾兵', attribute: 'defense', bp: 80, bpAfter: 80 },
        target: { name: '敵', attribute: 'attack', bp: 60, bpAfter: 0 },
        damageToTarget: 80,
        damageToActor: 0,
        actorShieldBroken: true,
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines).toHaveLength(1);
    expect(groups[0].lines[0]).toBe(
      '盾兵（盾・BP80）が 敵（剣・BP60）に近接攻撃 → 敵に80ダメージを与え、盾兵の盾が破壊された',
    );
  });

  it('近接で双方の盾が壊れた場合は1行にまとめる', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '盾A', attribute: 'defense', bp: 70 },
        target: { name: '盾B', attribute: 'defense', bp: 70 },
        damageToTarget: 0,
        damageToActor: 0,
        targetShieldBroken: true,
        actorShieldBroken: true,
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines).toHaveLength(1);
    expect(groups[0].lines[0]).toBe(
      '盾A（盾・BP70）が 盾B（盾・BP70）に近接攻撃 → 盾Bの盾が破壊された、盾Aの盾が破壊された',
    );
  });

  it('弓攻撃で盾を防いだ場合は攻撃ログの後に盾破壊ログを出す', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'bow',
        actor: { name: '弓兵', attribute: 'bow', bp: 50 },
        target: { name: '盾兵', attribute: 'defense', bp: 70 },
        damageToTarget: 0,
        damageToActor: 0,
      },
      {
        type: 'blocked',
        turn: 1,
        target: { name: '盾兵', attribute: 'defense', bp: 70 },
        blockContext: 'bow',
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines).toHaveLength(2);
    expect(groups[0].lines[0]).toContain('弓攻撃');
    expect(groups[0].lines[1]).toBe('盾兵の盾を破壊');
  });

  it('嵐は発生ログと巻き込みログの2行で表示する', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'storm_cast',
        turn: 1,
        actor: { name: '嵐王', attribute: 'storm', bp: 300 },
        stormDamage: 300,
      },
      {
        type: 'storm_engulf',
        turn: 1,
        stormDamage: 300,
        stormHits: [
          {
            target: { name: '剣士', attribute: 'attack', bp: 120, bpAfter: 0 },
            damage: 300,
            shieldBroken: false,
          },
          {
            target: { name: '盾兵', attribute: 'defense', bp: 80 },
            damage: 0,
            shieldBroken: true,
          },
        ],
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toBe('嵐王（嵐・BP300）が嵐を発生');
    expect(groups[0].lines[1]).toBe(
      '剣士（剣・BP120）と盾兵（盾・BP80）が嵐に巻き込まれた→剣士に300ダメージ、盾兵の盾を破壊',
    );
  });

  it('撃破ログはBPを表示しない', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '剣士', attribute: 'attack', bp: 80 },
        target: { name: '敵', attribute: 'attack', bp: 60 },
        damageToTarget: 60,
        damageToActor: 0,
      },
      {
        type: 'defeated',
        turn: 1,
        target: { name: '敵', attribute: 'attack', bp: 0, bpAfter: 0 },
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[1]).toBe('敵は撃破された');
  });

  it('毒付与ログはカード名のみで簡潔に表示する', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'poison_applied',
        turn: 1,
        actor: { name: '美味しい毒', attribute: 'poison', bp: 468 },
        target: { name: 'ほののひと', attribute: 'attack', bp: 664 },
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toBe('ほののひとに毒が付与された');
  });

  it('凍結ログはカード名のみで簡潔に表示する', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'frozen',
        turn: 1,
        actor: { name: '氷魔', attribute: 'ice', bp: 84 },
        target: { name: '戦士', attribute: 'attack', bp: 91 },
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toBe('戦士は凍結された');
  });

  it('先に撃破された攻撃は未実行ログを残す', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack_preempted',
        turn: 1,
        actionKind: 'melee',
        actor: { name: 'カードA', attribute: 'attack', bp: 200 },
        target: { name: 'カードX', attribute: 'attack', bp: 250 },
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toBe(
      'カードAはカードX（剣・BP250）を攻撃しようとしたが、その前に撃破された',
    );
  });

  it('先撃破ログがあるカードは撃破ログを重複表示しない', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: 'ニンニン', attribute: 'ninja', bp: 562 },
        target: { name: 'ふしのまもの', attribute: 'poison', bp: 444 },
        damageToTarget: 562,
        damageToActor: 0,
      },
      {
        type: 'attack_preempted',
        turn: 1,
        actionKind: 'melee',
        actor: { name: 'ふしのまもの', attribute: 'poison', bp: 444 },
        target: { name: 'あらっしぃ', attribute: 'storm', bp: 179 },
      },
      {
        type: 'defeated',
        turn: 1,
        target: { name: 'ふしのまもの', attribute: 'poison', bp: 0, bpAfter: 0 },
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines).toHaveLength(2);
    expect(groups[0].lines[1]).toBe(
      'ふしのまものはあらっしぃ（嵐・BP179）を攻撃しようとしたが、その前に撃破された',
    );
  });

  it('同一ターン内で2回目以降のカードは名前のみ表示する', () => {
    const events: BattleEvent[] = [
      { type: 'turn_start', turn: 1 },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'melee',
        actor: { name: '剣士', attribute: 'attack', bp: 80 },
        target: { name: '敵', attribute: 'attack', bp: 60 },
        damageToTarget: 20,
        damageToActor: 10,
      },
      {
        type: 'attack',
        turn: 1,
        actionKind: 'bow',
        actor: { name: '弓兵', attribute: 'bow', bp: 50 },
        target: { name: '敵', attribute: 'attack', bp: 40 },
        damageToTarget: 25,
        damageToActor: 0,
      },
    ];

    const groups = formatBattleLog(events);
    expect(groups[0].lines[0]).toContain('敵（剣・BP60）');
    expect(groups[0].lines[1]).toBe(
      '弓兵（弓・BP50）が 敵に弓攻撃 → 敵に25ダメージ',
    );
  });
});
