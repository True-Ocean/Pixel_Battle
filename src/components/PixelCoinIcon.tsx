interface PixelCoinIconProps {
  className?: string;
}

export function PixelCoinIcon({ className }: PixelCoinIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="header-pixel-coin-face" cx="36%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="38%" stopColor="#fcd34d" />
          <stop offset="72%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <linearGradient id="header-pixel-coin-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="12" fill="url(#header-pixel-coin-face)" />
      <circle
        cx="14"
        cy="14"
        r="12"
        fill="none"
        stroke="url(#header-pixel-coin-rim)"
        strokeWidth="1.4"
      />
      <circle cx="14" cy="14" r="8.6" fill="none" stroke="#fde68a" strokeWidth="0.9" opacity="0.75" />
      <ellipse
        cx="10.2"
        cy="10"
        rx="4.2"
        ry="2.8"
        fill="rgba(255,255,255,0.62)"
        transform="rotate(-24 10.2 10)"
      />
      <circle cx="14" cy="14" r="6.1" fill="rgba(180, 83, 9, 0.12)" />
      <text
        x="14"
        y="14.1"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#a16207"
        fontSize="10.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        opacity="0.95"
        letterSpacing="-0.35"
      >
        px
      </text>
    </svg>
  );
}
