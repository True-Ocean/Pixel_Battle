import { useEffect, useRef, useState } from 'react';

interface AnimatedBpProps {
  from: number;
  to: number;
  /** true のとき from→to をアニメーション */
  active: boolean;
  maxBp?: number;
  className?: string;
  onComplete?: () => void;
}

export function AnimatedBp({
  from,
  to,
  active,
  maxBp,
  className = '',
  onComplete,
}: AnimatedBpProps) {
  const [display, setDisplay] = useState(active ? from : to);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // アニメーション入力が変わったら、表示値をレンダー中に初期位置へ合わせる
  // （非アクティブなら to、アクティブなら from から開始）。
  const animKey = `${active}\u0000${from}\u0000${to}`;
  const [prevAnimKey, setPrevAnimKey] = useState(animKey);
  if (animKey !== prevAnimKey) {
    setPrevAnimKey(animKey);
    setDisplay(active ? from : to);
  }

  useEffect(() => {
    if (!active) return;

    const duration = 480;
    const start = performance.now();
    let frame = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      const next = Math.round(from + (to - from) * eased);
      setDisplay((prev) => (prev === next ? prev : next));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, from, to]);

  const damage = active && to < from;
  const wounded = maxBp != null && display < maxBp;

  return (
    <span
      className={`battle-card-bp ${damage ? 'bp-damage' : ''} ${
        wounded ? 'bp-wounded' : ''
      } ${className}`.trim()}
      aria-label={`BP ${display}`}
    >
      {display}
    </span>
  );
}
