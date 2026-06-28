import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, TransitionEvent } from 'react';
import { loadAppData } from '../app/loadAppData';
import { AppTitle } from './AppTitle';

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const TITLE_BG_URL = resolvePublicAssetUrl('title-bg.svg');
const MIN_DISPLAY_MS = 2000;
const FADE_MS = 450;

type TitlePhase = 'entering' | 'active' | 'exiting' | 'done';

interface TitleScreenProps {
  onComplete: () => void;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export function TitleScreen({ onComplete }: TitleScreenProps) {
  const [phase, setPhase] = useState<TitlePhase>('entering');
  const exitStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setPhase('done');
    onComplete();
  }, [onComplete]);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    setPhase('exiting');
    exitTimerRef.current = window.setTimeout(finish, FADE_MS);
  }, [finish]);

  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        await Promise.all([
          wait(MIN_DISPLAY_MS, signal),
          loadAppData(),
        ]);
        if (!exitStartedRef.current) beginExit();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        throw error;
      }
    })();

    return () => controller.abort();
  }, [beginExit]);

  useEffect(() => {
    if (phase !== 'entering') return;
    const frame = window.requestAnimationFrame(() => setPhase('active'));
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'opacity' || phase !== 'exiting') return;
    finish();
  };

  const handleSkip = () => {
    if (phase === 'exiting' || phase === 'done') return;
    beginExit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSkip();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="screen screen-title"
      style={
        {
          '--title-fade-ms': `${FADE_MS}ms`,
          '--title-bg-url': `url(${TITLE_BG_URL})`,
        } as CSSProperties
      }
      onClick={handleSkip}
      onKeyDown={handleKeyDown}
      aria-label="タイトル画面。タップでスキップ"
    >
      <div className="screen-title-bg" aria-hidden="true" />
      <div
        className={`screen-title-content is-${phase}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="screen-title-brand">
          <AppTitle className="app-title--splash" />
        </div>
      </div>
    </div>
  );
}
