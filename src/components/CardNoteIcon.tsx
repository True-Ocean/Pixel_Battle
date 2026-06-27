interface CardNoteIconProps {
  className?: string;
  filled?: boolean;
}

export function CardNoteIcon({ className, filled = false }: CardNoteIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 3.5h10a2 2 0 012 2v13a2 2 0 01-2 2H7a2 2 0 01-2-2v-13a2 2 0 012-2z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 8.4h7.6M8.2 12h7.6M8.2 15.6h4.8"
        fill="none"
        stroke={filled ? '#fff' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
