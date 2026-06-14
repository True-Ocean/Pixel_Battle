interface ExpIconProps {
  className?: string;
}

export function ExpIcon({ className }: ExpIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="exp-icon-face" cx="36%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ecfccb" />
          <stop offset="38%" stopColor="#86efac" />
          <stop offset="72%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <linearGradient id="exp-icon-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="12" fill="url(#exp-icon-face)" />
      <circle
        cx="14"
        cy="14"
        r="12"
        fill="none"
        stroke="url(#exp-icon-rim)"
        strokeWidth="1.4"
      />
      <circle cx="14" cy="14" r="8.6" fill="none" stroke="#dcfce7" strokeWidth="0.9" opacity="0.75" />
      <ellipse
        cx="10.2"
        cy="10"
        rx="4.2"
        ry="2.8"
        fill="rgba(255,255,255,0.55)"
        transform="rotate(-24 10.2 10)"
      />
      <text
        x="14"
        y="14.1"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#14532d"
        fontSize="7.2"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.2"
      >
        EXP
      </text>
    </svg>
  );
}
