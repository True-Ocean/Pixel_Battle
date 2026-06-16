import { useId } from 'react';

interface JewelIconProps {
  className?: string;
}

export function JewelIcon({ className }: JewelIconProps) {
  const uid = useId().replace(/:/g, '');
  const faceId = `jewel-face-${uid}`;
  const shineId = `jewel-shine-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={faceId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#f0abfc" />
          <stop offset="35%" stopColor="#e879f9" />
          <stop offset="70%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#86198f" />
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path
        d="M14 3.5 23.5 10.5 14 24.5 4.5 10.5Z"
        fill={`url(#${faceId})`}
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
        fill={`url(#${shineId})`}
        opacity="0.82"
      />
    </svg>
  );
}

interface JewelAmountProps {
  amount: number;
  className?: string;
  iconClassName?: string;
}

export function JewelAmount({
  amount,
  className = 'jewel-amount-inline',
  iconClassName = 'jewel-amount-icon',
}: JewelAmountProps) {
  return (
    <span className={className}>
      <JewelIcon className={iconClassName} />
      <span className="jewel-amount-value">{amount.toLocaleString()}</span>
    </span>
  );
}
