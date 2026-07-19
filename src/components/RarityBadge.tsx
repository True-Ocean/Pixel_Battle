import type { CSSProperties } from 'react';
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
      style={
        {
          '--rarity-badge-bg': meta.badgeBg,
          '--rarity-badge-border': meta.badgeBorder,
          '--rarity-badge-text': meta.badgeText,
        } as CSSProperties
      }
      aria-label={meta.ariaName}
      title={meta.ariaName}
    >
      <svg
        className="rarity-badge-shield"
        viewBox="0 0 32 36"
        aria-hidden="true"
      >
        <path
          className="rarity-badge-shield-body"
          d="M16 2.5 28 6.5v9.8c0 8-4.6 13.6-12 17.2C8.6 29.9 4 24.3 4 16.3V6.5l12-4Z"
        />
        <path
          className="rarity-badge-shield-highlight"
          d="M16 5.3 25 8.2v7.7c0 6.2-3.3 10.8-9 14-5.7-3.2-9-7.8-9-14V8.2l9-2.9Z"
        />
      </svg>
      <span className="rarity-badge-label">{meta.label}</span>
    </span>
  );
}
