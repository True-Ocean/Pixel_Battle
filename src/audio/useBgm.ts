import { useEffect, useRef } from 'react';
import { bgmPlayer } from './bgmPlayer';
import type { ScreenId } from '../types';

/** 画面に応じて BGM を切り替え、初回ユーザー操作後に再生を許可する */
export function useBgm(screen: ScreenId, soundEnabled: boolean): void {
  const unlockListenersBoundRef = useRef(false);

  useEffect(() => {
    bgmPlayer.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    bgmPlayer.setScreen(screen);
  }, [screen]);

  useEffect(() => {
    if (unlockListenersBoundRef.current) return;
    unlockListenersBoundRef.current = true;

    const unlock = () => {
      bgmPlayer.unlock();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);
}
