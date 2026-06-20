import { ATTRIBUTE_META } from '../config/attributes';
import type { Attribute } from '../types';
import type { BattleEvent, BattleLogUnitSnapshot } from '../types/battle';

export interface BattleLogTurnGroup {
  turn: number;
  lines: string[];
}

interface TurnFormatContext {
  introducedNames: Set<string>;
  preemptedDefeatNames: Set<string>;
}

function unitLabel(name: string, attribute: Attribute, bp: number): string {
  const meta = ATTRIBUTE_META[attribute];
  return `${name}（${meta.label}・BP${bp}）`;
}

function cardRef(
  snap: BattleLogUnitSnapshot,
  ctx: TurnFormatContext,
  useAfter = false,
): string {
  if (ctx.introducedNames.has(snap.name)) {
    return snap.name;
  }
  ctx.introducedNames.add(snap.name);
  const bp =
    useAfter && snap.bpAfter != null ? snap.bpAfter : snap.bp;
  return unitLabel(snap.name, snap.attribute, bp);
}

function actionLabel(kind: NonNullable<BattleEvent['actionKind']>): string {
  switch (kind) {
    case 'melee':
      return '近接攻撃';
    case 'bow':
      return '弓攻撃';
    case 'dual_primary':
      return '両攻撃';
    case 'dual_secondary':
      return '副攻撃';
    case 'storm':
      return '嵐';
    case 'heal':
      return '回復';
    case 'poison_dot':
      return '毒ダメージ';
    default:
      return '攻撃';
  }
}

function formatMeleeDamageSuffix(event: BattleEvent): string {
  const actor = event.actor!;
  const target = event.target!;
  const dealt = event.damageToTarget ?? event.damage ?? 0;
  const received = event.damageToActor ?? 0;
  const targetPart = event.targetShieldBroken
    ? `${target.name}の盾が破壊された`
    : `${target.name}に${dealt}ダメージを与え`;
  const actorPart = event.actorShieldBroken
    ? `${actor.name}の盾が破壊された`
    : `${actor.name}は${received}ダメージを受けた`;
  return `${targetPart}、${actorPart}`;
}

function formatDamageSuffix(event: BattleEvent): string {
  const toTarget = event.damageToTarget ?? event.damage ?? 0;
  const toActor = event.damageToActor ?? 0;
  if (
    event.actionKind === 'melee' ||
    event.actionKind === 'dual_primary'
  ) {
    return formatMeleeDamageSuffix(event);
  }
  if (event.actionKind === 'heal') {
    const heal = event.healAmount ?? 0;
    const parts: string[] = [];
    if (heal > 0) parts.push(`${heal}回復`);
    if (event.poisonStacksCleared && event.poisonStacksCleared > 0) {
      parts.push('毒解消');
    }
    if (event.freezeCleared) {
      parts.push('凍結解消');
    }
    return parts.length > 0 ? parts.join('・') : '効果なし';
  }
  if (event.actionKind === 'poison_dot') {
    return `${toTarget}ダメージ`;
  }
  if (toTarget <= 0 && toActor <= 0) {
    return 'ダメージなし';
  }
  const parts: string[] = [];
  if (event.target) {
    parts.push(`${event.target.name}に${toTarget}ダメージ`);
  }
  if (toActor > 0 && event.actor) {
    parts.push(`${event.actor.name}に${toActor}ダメージ`);
  }
  return parts.join('、');
}

function formatStormEngulfLine(
  event: BattleEvent,
  ctx: TurnFormatContext,
): string | null {
  if (!event.stormHits || event.stormHits.length === 0) return null;
  const targetLabels = event.stormHits
    .map((hit) => cardRef(hit.target, ctx))
    .join('と');
  const resultParts = event.stormHits.map((hit) => {
    if (hit.shieldBroken && hit.damage <= 0) {
      return `${hit.target.name}の盾を破壊`;
    }
    return `${hit.target.name}に${hit.damage}ダメージ`;
  });
  return `${targetLabels}が嵐に巻き込まれた→${resultParts.join('、')}`;
}

function formatEventLine(
  event: BattleEvent,
  ctx: TurnFormatContext,
): string | null {
  switch (event.type) {
    case 'turn_start':
      return null;
    case 'storm_cast':
      if (!event.actor) return null;
      return `${cardRef(event.actor, ctx)}が嵐を発生`;
    case 'storm_engulf':
      return formatStormEngulfLine(event, ctx);
    case 'shield_granted':
      if (!event.actor || !event.target) return null;
      return `${cardRef(event.actor, ctx)}が ${cardRef(event.target, ctx)}に盾を付与`;
    case 'attack':
      if (event.actionKind === 'poison_dot' && event.target) {
        return `${cardRef(event.target, ctx)}が毒ダメージ → ${formatDamageSuffix(event)}`;
      }
      if (!event.actor || !event.target || !event.actionKind) return null;
      return `${cardRef(event.actor, ctx)}が ${cardRef(event.target, ctx)}に${actionLabel(event.actionKind)} → ${formatDamageSuffix(event)}`;
    case 'blocked':
      if (!event.target) return null;
      if (event.blockContext === 'melee') return null;
      return `${cardRef(event.target, ctx)}の盾を破壊`;
    case 'defeated':
      if (!event.target) return null;
      if (ctx.preemptedDefeatNames.has(event.target.name)) return null;
      return `${cardRef(event.target, ctx)}は撃破された`;
    case 'promoted':
      if (!event.actor) return null;
      return `${cardRef(event.actor, ctx)}が前衛へ移動`;
    case 'frozen':
      if (!event.target) return null;
      if (!ctx.introducedNames.has(event.target.name)) {
        ctx.introducedNames.add(event.target.name);
      }
      return `${event.target.name}は凍結された`;
    case 'poison_applied':
      if (!event.target) return null;
      if (!ctx.introducedNames.has(event.target.name)) {
        ctx.introducedNames.add(event.target.name);
      }
      return `${event.target.name}に毒が付与された`;
    case 'shield_broken':
      if (!event.target) return null;
      if (event.blockContext === 'melee') return null;
      return `${cardRef(event.target, ctx)}の盾を破壊`;
    case 'attack_preempted':
      if (!event.actor) return null;
      ctx.preemptedDefeatNames.add(event.actor.name);
      if (!ctx.introducedNames.has(event.actor.name)) {
        ctx.introducedNames.add(event.actor.name);
      }
      if (!event.target) {
        if (event.actionKind === 'storm') {
          return `${event.actor.name}は嵐を発生しようとしたが、その前に撃破された`;
        }
        return `${event.actor.name}は攻撃しようとしたが、その前に撃破された`;
      }
      return `${event.actor.name}は${cardRef(event.target, ctx)}を攻撃しようとしたが、その前に撃破された`;
    case 'stealth_mutual_break':
      if (!event.actor || !event.target) return null;
      return `${cardRef(event.actor, ctx)}と${cardRef(event.target, ctx)}は互いにステルスを解除した`;
    default:
      return null;
  }
}

export function formatBattleLog(events: readonly BattleEvent[]): BattleLogTurnGroup[] {
  const groups = new Map<number, string[]>();
  const contexts = new Map<number, TurnFormatContext>();

  for (const event of events) {
    if (event.type === 'turn_start') {
      if (!groups.has(event.turn)) {
        groups.set(event.turn, []);
        contexts.set(event.turn, {
          introducedNames: new Set(),
          preemptedDefeatNames: new Set(),
        });
      }
      continue;
    }
    const turn = event.turn ?? 1;
    if (!contexts.has(turn)) {
      contexts.set(turn, {
        introducedNames: new Set(),
        preemptedDefeatNames: new Set(),
      });
    }
    const ctx = contexts.get(turn)!;
    const line = formatEventLine(event, ctx);
    if (!line) continue;
    const lines = groups.get(turn) ?? [];
    lines.push(line);
    groups.set(turn, lines);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([turn, lines]) => ({ turn, lines }));
}
