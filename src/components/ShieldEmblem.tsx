interface ShieldEmblemProps {
  className?: string;
  /** grant: 盾付与可能の小さな表示 / active: 所持中の中央表示 */
  variant?: 'grant' | 'active';
}

/** レア度エンブレムと同形状の盾シルエット */
export function ShieldEmblem({
  className = '',
  variant = 'active',
}: ShieldEmblemProps) {
  const classes = [
    'shield-emblem',
    `shield-emblem--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      viewBox="0 0 32 36"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="shield-emblem-body"
        d="M16 2.5 28 6.5v9.8c0 8-4.6 13.6-12 17.2C8.6 29.9 4 24.3 4 16.3V6.5l12-4Z"
      />
      <path
        className="shield-emblem-highlight"
        d="M16 5.3 25 8.2v7.7c0 6.2-3.3 10.8-9 14-5.7-3.2-9-7.8-9-14V8.2l9-2.9Z"
      />
    </svg>
  );
}
