declare global {
  interface Navigator {
    /** iOS Safari: ホーム画面から起動した Web アプリのとき true */
    standalone?: boolean;
  }
}

/** ホーム画面追加の Web アプリ / インストール済み PWA か */
export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.navigator.standalone === true) return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}

function syncStandaloneLandscapeClass(): void {
  const root = document.documentElement;
  const standalone = isStandaloneWebApp();
  root.classList.toggle('is-standalone-app', standalone);
  const landscape =
    standalone &&
    (window.matchMedia('(orientation: landscape)').matches ||
      window.innerWidth > window.innerHeight);
  root.classList.toggle('is-standalone-landscape', landscape);
}

/** 可能な環境では画面向きを縦にロックする（主に Android のインストール済み PWA）。 */
export function lockPortraitOrientation(): void {
  if (!isStandaloneWebApp()) return;
  const orientation = screen.orientation;
  if (!orientation || typeof orientation.lock !== 'function') return;
  void orientation.lock('portrait').catch(() => {
    // iOS や非 fullscreen では拒否されることがある（CSS フォールバックあり）
  });
}

/**
 * 通常のモバイルブラウザでは向きを触らない。
 * Web アプリ（standalone）として起動しているときだけ縦固定を試みる。
 */
export function installPortraitOrientationLock(): void {
  syncStandaloneLandscapeClass();

  const onOrientationMaybeChanged = () => {
    syncStandaloneLandscapeClass();
    lockPortraitOrientation();
  };

  window.addEventListener('orientationchange', onOrientationMaybeChanged);
  window.addEventListener('resize', onOrientationMaybeChanged);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      onOrientationMaybeChanged();
    }
  });

  if (!isStandaloneWebApp()) return;

  lockPortraitOrientation();
  document.addEventListener(
    'pointerdown',
    () => {
      lockPortraitOrientation();
    },
    { passive: true, once: true },
  );
}
