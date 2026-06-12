import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!active) {
      setDisplay(to);
      return;
    }

    setDisplay(from);
    const duration = 480;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, from, to, onComplete]);

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
