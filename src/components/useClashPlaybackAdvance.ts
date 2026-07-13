import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { BattleState } from '../types/battle';
import { CLASH_MS } from './battleClashTypes';
import type { BattlePlayback } from './battlePlaybackTypes';

/**
 * clash 再生カーソルを CLASH_MS タイミングで進める（オフライン / オンライン共通）。
 * onComplete は phase==='done' のあと呼ばれる。クライアントで resolveTurn は再実行しない。
 */
export function useClashPlaybackAdvance(
  playback: BattlePlayback | null,
  uiPhase: string,
  setPlayback: Dispatch<SetStateAction<BattlePlayback | null>>,
  setState: (state: BattleState) => void,
  onComplete: (pendingNext: BattleState) => void,
): void {
  useEffect(() => {
    if (!playback || uiPhase !== 'clash') return;
    if (playback.phase === 'heal') {
      if (playback.healSubPhase === 'damage') {
        const t = window.setTimeout(
          () =>
            setPlayback((p) =>
              p ? { ...p, healSubPhase: 'bp' } : null,
            ),
          CLASH_MS.damage,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(
        () => {
          const firstAttack = playback.attacks[0];
          const nextPhase =
            playback.illuminates.length > 0
              ? 'illuminate'
              : playback.shields.length > 0
                ? 'shield'
                : firstAttack
                  ? 'attack'
                  : 'done';
          if (nextPhase === 'illuminate') {
            setState(playback.stateAfterHeals);
          } else if (nextPhase === 'shield' || nextPhase === 'attack') {
            setState(playback.stateAfterIlluminates);
            setState(playback.shieldState);
          } else {
            setState(playback.stateAfterIlluminates);
          }
          setPlayback((p) =>
            p
              ? {
                  ...p,
                  phase: nextPhase,
                  attackIndex: 0,
                  attackSubPhase: 'damage',
                }
              : null,
          );
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    if (playback.phase === 'illuminate') {
      const t = window.setTimeout(
        () => {
          const firstAttack = playback.attacks[0];
          const nextPhase =
            playback.shields.length > 0
              ? 'shield'
              : firstAttack
                ? 'attack'
                : 'done';
          setState(playback.stateAfterIlluminates);
          if (nextPhase === 'shield' || nextPhase === 'attack') {
            setState(playback.shieldState);
          }
          setPlayback((p) =>
            p
              ? {
                  ...p,
                  phase: nextPhase,
                  attackIndex: 0,
                  attackSubPhase: 'damage',
                }
              : null,
          );
        },
        CLASH_MS.damage + CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    if (playback.phase === 'shield') {
      const t = window.setTimeout(
        () => {
          const firstAttack = playback.attacks[0];
          if (firstAttack) {
            setPlayback((p) =>
              p
                ? {
                    ...p,
                    phase: 'attack',
                    attackIndex: 0,
                    attackSubPhase: 'damage',
                  }
                : null,
            );
          } else {
            setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
          }
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    if (playback.phase === 'attack') {
      const attack = playback.attacks[playback.attackIndex];
      if (!attack) {
        setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
        return;
      }
      if (playback.attackSubPhase === 'damage') {
        const t = window.setTimeout(
          () =>
            setPlayback((p) =>
              p ? { ...p, attackSubPhase: 'bp' } : null,
            ),
          CLASH_MS.damage,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(
        () => {
          const nextIndex = playback.attackIndex + 1;
          const nextAttack = playback.attacks[nextIndex];
          setState(attack.stateAfter);
          if (nextAttack) {
            setPlayback((p) =>
              p
                ? {
                    ...p,
                    attackIndex: nextIndex,
                    attackSubPhase: 'damage',
                  }
                : null,
            );
          } else {
            setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
          }
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => onComplete(playback.pendingNext),
      CLASH_MS.exit,
    );
    return () => window.clearTimeout(t);
  }, [onComplete, playback, setPlayback, setState, uiPhase]);
}
