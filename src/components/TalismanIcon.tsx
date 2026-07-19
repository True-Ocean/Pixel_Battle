interface TalismanIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const TALISMAN_ICON_URL = resolvePublicAssetUrl('talisman.png');

export function TalismanIcon({
  className,
  'aria-hidden': ariaHidden = true,
}: TalismanIconProps) {
  return (
    <img
      className={['talisman-icon', className].filter(Boolean).join(' ')}
      src={TALISMAN_ICON_URL}
      alt=""
      width={28}
      height={28}
      draggable={false}
      aria-hidden={ariaHidden}
    />
  );
}
