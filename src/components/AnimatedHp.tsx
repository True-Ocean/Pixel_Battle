import { useEffect, useState } from 'react';

interface AnimatedHpProps {
  from: number;
  to: number;
  /** true のとき from→to をアニメーション */
  active: boolean;
  className?: string;
  onComplete?: () => void;
}

export function AnimatedHp({
  from,
  to,
  active,
  className = '',
  onComplete,
}: AnimatedHpProps) {
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

  return (
    <span
      className={`battle-card-hp ${damage ? 'hp-damage' : ''} ${className}`.trim()}
      aria-label={`HP ${display}`}
    >
      {display}
    </span>
  );
}
