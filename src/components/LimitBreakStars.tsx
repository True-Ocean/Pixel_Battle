import { getLimitBreakStarColor } from '../card/limitBreak';
import type { CardRarity, CardStars } from '../types';

interface LimitBreakStarsProps {
  stars: CardStars;
  rarity: CardRarity;
  className?: string;
}

export function LimitBreakStars({
  stars,
  rarity,
  className = '',
}: LimitBreakStarsProps) {
  return (
    <span
      className={`limit-break-stars${className ? ` ${className}` : ''}`}
      aria-label={`限界突破 ${stars}/3`}
      title={`限界突破 ${stars}/3`}
    >
      {[0, 1, 2].map((index) => {
        const filled = index < stars;
        return (
          <span
            key={index}
            className={filled ? 'limit-break-star--filled' : 'limit-break-star--empty'}
            style={{ color: getLimitBreakStarColor(filled, rarity) }}
            aria-hidden
          >
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}
