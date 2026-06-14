interface JewelIconProps {
  className?: string;
}

export function JewelIcon({ className }: JewelIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="header-jewel-face" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#fce7f3" />
          <stop offset="35%" stopColor="#e879f9" />
          <stop offset="70%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#86198f" />
        </linearGradient>
        <linearGradient id="header-jewel-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path
        d="M14 3.5 23.5 10.5 14 24.5 4.5 10.5Z"
        fill="url(#header-jewel-face)"
        stroke="#9d174d"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5 18.5 10.5 14 24.5 9.5 10.5Z"
        fill="rgba(134, 25, 143, 0.22)"
      />
      <path
        d="M4.5 10.5 14 3.5 23.5 10.5 14 13.5Z"
        fill="url(#header-jewel-shine)"
        opacity="0.55"
      />
    </svg>
  );
}
