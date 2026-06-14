interface TalismanIconProps {
  className?: string;
}

export function TalismanIcon({ className }: TalismanIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14 4.5c-1.2 0-2.2 1-2.2 2.2v1.1H9.8c-.8 0-1.4.6-1.4 1.4v11.2c0 2.2 2.4 3.6 5.6 3.6s5.6-1.4 5.6-3.6V9.2c0-.8-.6-1.4-1.4-1.4h-1.8V6.7c0-1.2-1-2.2-2.2-2.2Z"
        fill="#fef3c7"
        stroke="#d97706"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M11.2 7.8h5.6"
        stroke="#d97706"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <rect
        x="10.4"
        y="10.8"
        width="7.2"
        height="8.4"
        rx="1"
        fill="#fde68a"
        stroke="#b45309"
        strokeWidth="0.9"
      />
      <path
        d="M12.2 13.2h3.6M12.2 15.6h3.6M12.2 18h2.4"
        stroke="#b45309"
        strokeWidth="0.85"
        strokeLinecap="round"
      />
      <circle cx="14" cy="5.2" r="1.1" fill="none" stroke="#d97706" strokeWidth="0.9" />
      <path
        d="M14 3.8v1.4"
        stroke="#d97706"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
