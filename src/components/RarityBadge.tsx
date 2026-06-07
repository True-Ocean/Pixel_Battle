import { getRarityMeta } from '../config/rarity';
import type { CardRarity } from '../types';

interface RarityBadgeProps {
  rarity: CardRarity;
  className?: string;
  size?: 'card' | 'deck';
}

export function RarityBadge({
  rarity,
  className = '',
  size = 'card',
}: RarityBadgeProps) {
  const meta = getRarityMeta(rarity);
  const classes = [
    'rarity-badge',
    `rarity-badge--${rarity}`,
    size === 'deck' ? 'rarity-badge--deck' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={{
        background: meta.badgeBg,
        borderColor: meta.badgeBorder,
        color: meta.badgeText,
      }}
      aria-label={meta.ariaName}
      title={meta.ariaName}
    >
      {meta.label}
    </span>
  );
}
