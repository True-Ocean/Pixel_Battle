import type { BattleSide, BattleState } from '../types/battle';
import type {
  AttackPlayback,
  HealPlayback,
  IlluminatePlayback,
  PoisonDoTPlayback,
  ResolveTurnResult,
  ShieldPlayback,
} from '../game/turnResult';
import { flipBattleStateForGuest } from './battleSync';
import type { OnlineBattleRole } from './types';

/**
 * サーバーが last_clash に保存する clash 再生データ（host 視点）。
 * クライアントは resolveTurn を再実行せず、このイベント列だけを再生する（§7.2）。
 */
export interface OnlineClashPlaybackEvents {
  preClashState: BattleState;
  stateAfterHeals: BattleState;
  stateAfterIlluminates: BattleState;
  shieldState: BattleState;
  /** clash 解決直後（強制昇格前） */
  pendingNext: BattleState;
  heals: HealPlayback[];
  illuminates: IlluminatePlayback[];
  shields: ShieldPlayback[];
  attacks: AttackPlayback[];
}

function flipSide(side: BattleSide): BattleSide {
  return side === 'player' ? 'cpu' : 'player';
}

function flipHeal(h: HealPlayback): HealPlayback {
  return { ...h, side: flipSide(h.side) };
}

function flipIlluminate(i: IlluminatePlayback): IlluminatePlayback {
  return { ...i, side: flipSide(i.side) };
}

function flipShield(s: ShieldPlayback): ShieldPlayback {
  return { ...s, side: flipSide(s.side) };
}

function flipAttack(a: AttackPlayback): AttackPlayback {
  return {
    ...a,
    fromSide: flipSide(a.fromSide),
    toSide: flipSide(a.toSide),
    stateAfter: flipBattleStateForGuest(a.stateAfter),
  };
}

function flipPoison(p: PoisonDoTPlayback): PoisonDoTPlayback {
  return { ...p, side: flipSide(p.side) };
}

export function buildOnlineClashPlaybackEvents(
  preClashState: BattleState,
  result: ResolveTurnResult,
): OnlineClashPlaybackEvents {
  return {
    preClashState,
    stateAfterHeals: result.stateAfterHeals,
    stateAfterIlluminates: result.stateAfterIlluminates,
    shieldState: result.shieldState,
    pendingNext: result.state,
    heals: result.heals,
    illuminates: result.illuminates,
    shields: result.shields,
    attacks: result.attacks,
  };
}

export function toLocalClashPlaybackEvents(
  events: OnlineClashPlaybackEvents,
  role: OnlineBattleRole,
): OnlineClashPlaybackEvents {
  if (role === 'host') return events;
  return {
    preClashState: flipBattleStateForGuest(events.preClashState),
    stateAfterHeals: flipBattleStateForGuest(events.stateAfterHeals),
    stateAfterIlluminates: flipBattleStateForGuest(events.stateAfterIlluminates),
    shieldState: flipBattleStateForGuest(events.shieldState),
    pendingNext: flipBattleStateForGuest(events.pendingNext),
    heals: events.heals.map(flipHeal),
    illuminates: events.illuminates.map(flipIlluminate),
    shields: events.shields.map(flipShield),
    attacks: events.attacks.map(flipAttack),
  };
}

export function toLocalPoisonDots(
  dots: PoisonDoTPlayback[],
  role: OnlineBattleRole,
): PoisonDoTPlayback[] {
  if (role === 'host') return dots;
  return dots.map(flipPoison);
}

/** UI 用 ResolveTurnResult 形へ（shieldGrants は再生に不要） */
export function playbackEventsToResolveResult(
  events: OnlineClashPlaybackEvents,
): ResolveTurnResult {
  return {
    state: events.pendingNext,
    stateAfterHeals: events.stateAfterHeals,
    stateAfterIlluminates: events.stateAfterIlluminates,
    shieldState: events.shieldState,
    shieldGrants: { player: [], cpu: [] },
    heals: events.heals,
    illuminates: events.illuminates,
    attacks: events.attacks,
    shields: events.shields,
  };
}

export function onlineClashReplayKey(turn: number, preClashRevision: number): string {
  return `${turn}:${preClashRevision}`;
}

/**
 * いまの room に対して last_clash を再生すべきか。
 * 古い last_clash の再再生や、revision が進みすぎたものの掘り起こしを防ぐ。
 */
export function shouldStartOnlineClashReplay(
  room: {
    battleRevision: number;
    lastClash: {
      turn: number;
      preClashRevision: number;
      playbackEvents?: unknown;
    } | null;
  },
  playedKey: string | null,
): boolean {
  const lastClash = room.lastClash;
  if (!lastClash?.playbackEvents) return false;
  const key = onlineClashReplayKey(lastClash.turn, lastClash.preClashRevision);
  if (playedKey === key) return false;
  const pre = lastClash.preClashRevision;
  const rev = room.battleRevision;
  // clash で +1、続けて turn_start で +1 までを「いまの再生対象」とみなす
  return rev >= pre + 1 && rev <= pre + 2;
}
