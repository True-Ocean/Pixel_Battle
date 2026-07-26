interface AdIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const AD_ICON_URL = resolvePublicAssetUrl('ad.png');

export function AdIcon({
  className,
  'aria-hidden': ariaHidden = true,
}: AdIconProps) {
  return (
    <img
      className={['ad-icon', className].filter(Boolean).join(' ')}
      src={AD_ICON_URL}
      alt=""
      width={28}
      height={28}
      draggable={false}
      aria-hidden={ariaHidden}
    />
  );
}
