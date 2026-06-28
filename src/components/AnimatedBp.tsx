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
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      setDisplay((prev) => (prev === to ? prev : to));
      return;
    }

    setDisplay((prev) => (prev === from ? prev : from));
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
