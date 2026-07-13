import { describe, expect, it } from 'vitest';
import { createBattleState } from '../game/battleState';
import { resolveTurn } from '../game/resolveTurn';
import { pickPassAction } from '../game/actionChoices';
import type { Card } from '../types';
import {
  buildOnlineClashPlaybackEvents,
  onlineClashReplayKey,
  playbackEventsToResolveResult,
  shouldStartOnlineClashReplay,
  toLocalClashPlaybackEvents,
  toLocalPoisonDots,
} from './onlineClashPlayback';
import { createBattlePlayback } from '../components/createBattlePlayback';

function stub(id: string, bp = 100): Card {
  return {
    id,
    name: id,
    attribute: 'attack',
    bp,
    pixels: [],
    canvasSize: 16,
    rarity: 'N',
    stars: 0,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('onlineClashPlayback', () => {
  it('buildOnlineClashPlaybackEvents は resolveTurn 結果を保存し再シミュレーション不要', () => {
    const cards = Array.from({ length: 5 }, (_, i) => stub(`h${i}`));
    const cpu = Array.from({ length: 5 }, (_, i) => stub(`g${i}`));
    const pre = createBattleState(cards, cpu);
    const result = resolveTurn(pre, {
      player: pickPassAction(pre, 'player'),
      cpu: pickPassAction(pre, 'cpu'),
    });
    const events = buildOnlineClashPlaybackEvents(pre, result);
    expect(events.preClashState.turn).toBe(0);
    expect(events.pendingNext.turn).toBe(1);
    expect(events.attacks).toEqual(result.attacks);
    const playback = createBattlePlayback(playbackEventsToResolveResult(events));
    expect(playback.pendingNext.turn).toBe(1);
  });

  it('toLocalClashPlaybackEvents は guest で side と state を反転する', () => {
    const cards = Array.from({ length: 5 }, (_, i) => stub(`h${i}`));
    const cpu = Array.from({ length: 5 }, (_, i) => stub(`g${i}`));
    const pre = createBattleState(cards, cpu);
    const result = resolveTurn(pre, {
      player: pickPassAction(pre, 'player'),
      cpu: pickPassAction(pre, 'cpu'),
    });
    const events = buildOnlineClashPlaybackEvents(pre, result);
    const local = toLocalClashPlaybackEvents(events, 'guest');
    expect(local.preClashState.player.map((u) => u.cardId)).toEqual(
      events.preClashState.cpu.map((u) => u.cardId),
    );
    expect(local.preClashState.cpu.map((u) => u.cardId)).toEqual(
      events.preClashState.player.map((u) => u.cardId),
    );
  });

  it('toLocalPoisonDots は guest で side を反転する', () => {
    const flipped = toLocalPoisonDots(
      [
        {
          side: 'player',
          position: 'frontLeft',
          damage: 3,
          bpFrom: 10,
          bpTo: 7,
        },
      ],
      'guest',
    );
    expect(flipped[0]!.side).toBe('cpu');
  });

  it('onlineClashReplayKey は turn と revision で一意', () => {
    expect(onlineClashReplayKey(0, 1)).toBe('0:1');
    expect(onlineClashReplayKey(1, 3)).toBe('1:3');
  });
});

describe('shouldStartOnlineClashReplay', () => {
  it('未再生かつ revision が clash 直後なら true', () => {
    expect(
      shouldStartOnlineClashReplay(
        {
          battleRevision: 2,
          lastClash: {
            turn: 0,
            preClashRevision: 1,
            playbackEvents: {},
          },
        },
        null,
      ),
    ).toBe(true);
  });

  it('既読キーは false', () => {
    expect(
      shouldStartOnlineClashReplay(
        {
          battleRevision: 2,
          lastClash: {
            turn: 0,
            preClashRevision: 1,
            playbackEvents: {},
          },
        },
        '0:1',
      ),
    ).toBe(false);
  });

  it('revision が進みすぎた last_clash は false', () => {
    expect(
      shouldStartOnlineClashReplay(
        {
          battleRevision: 5,
          lastClash: {
            turn: 0,
            preClashRevision: 1,
            playbackEvents: {},
          },
        },
        null,
      ),
    ).toBe(false);
  });
});
