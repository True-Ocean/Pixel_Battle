import { getAttributeMeta } from '../config/attributes';
import type { Attribute } from '../types';

interface AttributeBadgeProps {
  attribute: Attribute;
  className?: string;
  /** デッキ一覧などやや大きめ表示 */
  size?: 'card' | 'deck';
}

export function AttributeBadge({
  attribute,
  className = '',
  size = 'card',
}: AttributeBadgeProps) {
  const meta = getAttributeMeta(attribute);
  const classes = [
    'attr-badge',
    `attr-badge--${attribute}`,
    size === 'deck' ? 'attr-badge--deck' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={{ background: meta.bg, borderColor: meta.border }}
      aria-label={meta.ariaName}
      title={meta.ariaName}
    >
      {meta.label}
    </span>
  );
}
