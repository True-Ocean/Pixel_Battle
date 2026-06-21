interface HelpInfoButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

export function HelpInfoButton({
  onClick,
  className,
  ariaLabel = 'ヘルプを見る',
}: HelpInfoButtonProps) {
  const classNames = ['help-info-btn', className].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classNames}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span aria-hidden>?</span>
    </button>
  );
}
