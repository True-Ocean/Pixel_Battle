import { CardNoteIcon } from './CardNoteIcon';

interface CardNoteIconButtonProps {
  filled?: boolean;
  className?: string;
  ariaLabel?: string;
  onClick: () => void;
}

export function CardNoteIconButton({
  filled = false,
  className,
  ariaLabel = 'カードノート',
  onClick,
}: CardNoteIconButtonProps) {
  const classNames = [
    'card-note-icon-btn',
    filled ? 'card-note-icon-btn--filled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <CardNoteIcon className="card-note-icon-btn-icon" filled={filled} />
    </button>
  );
}
