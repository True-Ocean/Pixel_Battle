import { BGM_PATHS, BGM_VOLUME } from '../config/bgm';
import type { ScreenId } from '../types';

export type BgmTrack = 'game' | 'battle' | 'none';

function resolveBgmUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

function createLoopAudio(path: string): HTMLAudioElement {
  const audio = new Audio(resolveBgmUrl(path));
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = BGM_VOLUME;
  return audio;
}

function trackForScreen(screen: ScreenId): BgmTrack {
  if (screen === 'title') return 'none';
  if (screen === 'battleSetup') return 'battle';
  return 'game';
}

class BgmPlayer {
  private readonly gameAudio = createLoopAudio(BGM_PATHS.game);
  private readonly battleAudio = createLoopAudio(BGM_PATHS.battle);
  private current: BgmTrack = 'none';
  private unlocked = false;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.pauseAll();
      return;
    }
    if (this.unlocked && this.current !== 'none') {
      this.playTrack(this.current);
    }
  }

  setScreen(screen: ScreenId): void {
    this.switchTo(trackForScreen(screen));
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.current !== 'none' && this.enabled) {
      this.playTrack(this.current);
    }
  }

  private switchTo(track: BgmTrack): void {
    if (track === this.current) return;
    this.pauseAll();
    this.current = track;
    if (track === 'none' || !this.unlocked || !this.enabled) return;
    if (track === 'battle') {
      this.battleAudio.currentTime = 0;
    }
    this.playTrack(track);
  }

  private playTrack(track: BgmTrack): void {
    const audio = track === 'battle' ? this.battleAudio : this.gameAudio;
    void audio.play().catch(() => {
      /* 自動再生ブロック時は unlock 後に再試行 */
    });
  }

  private pauseAll(): void {
    this.gameAudio.pause();
    this.battleAudio.pause();
  }
}

export const bgmPlayer = new BgmPlayer();
