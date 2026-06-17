import { TalismanIcon } from './TalismanIcon';

export type TalismanCardBadgeVariant = 'equipped' | 'available';

interface TalismanCardBadgeProps {
  variant: TalismanCardBadgeVariant;
  onPress?: () => void;
  className?: string;
  size?: 'detail' | 'deck';
}

export function TalismanCardBadge({
  variant,
  onPress,
  className,
  size = 'detail',
}: TalismanCardBadgeProps) {
  const classes = [
    'talisman-card-badge',
    `talisman-card-badge--${variant}`,
    `talisman-card-badge--${size}`,
    onPress ? 'talisman-card-badge--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const label =
    variant === 'equipped'
      ? '護符を装備中。タップして外す'
      : '護符をつける。タップして装備';

  if (onPress) {
    return (
      <button
        type="button"
        className={classes}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
      >
        <TalismanIcon className="talisman-card-badge-icon" />
      </button>
    );
  }

  return (
    <span className={classes} aria-label="護符を装備中" title="護符装備中">
      <TalismanIcon className="talisman-card-badge-icon" />
    </span>
  );
}
