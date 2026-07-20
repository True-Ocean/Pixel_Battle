interface JewelIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const JEWEL_ICON_URL = resolvePublicAssetUrl('jewel.png');

export function JewelIcon({
  className,
  'aria-hidden': ariaHidden = true,
}: JewelIconProps) {
  return (
    <img
      className={['jewel-icon', className].filter(Boolean).join(' ')}
      src={JEWEL_ICON_URL}
      alt=""
      width={28}
      height={28}
      draggable={false}
      aria-hidden={ariaHidden}
    />
  );
}

interface JewelAmountProps {
  amount: number;
  className?: string;
  iconClassName?: string;
}

export function JewelAmount({
  amount,
  className,
  iconClassName = 'jewel-amount-icon',
}: JewelAmountProps) {
  return (
    <span
      className={['jewel-amount-inline', className].filter(Boolean).join(' ')}
    >
      <JewelIcon className={iconClassName} />
      <span className="jewel-amount-value">{amount.toLocaleString()}</span>
    </span>
  );
}
