import { PixelCoinIcon } from './PixelCoinIcon';
import { JewelIcon } from './JewelIcon';

interface EconomyBalanceChangeProps {
  label: string;
  kind: 'px' | 'jewel';
  previous: number;
  next: number;
}

export function EconomyBalanceChange({
  label,
  kind,
  previous,
  next,
}: EconomyBalanceChangeProps) {
  const delta = next - previous;
  if (delta === 0) return null;

  const iconClassName =
    kind === 'px'
      ? 'economy-balance-change-icon economy-balance-change-icon--px'
      : 'economy-balance-change-icon economy-balance-change-icon--jewel';

  return (
    <div className="economy-balance-change">
      <p
        className="economy-balance-change-line"
        aria-label={`${label} ${previous.toLocaleString()}から${next.toLocaleString()}へ`}
      >
        <span className="economy-balance-change-label">{label}</span>
        {kind === 'px' ? (
          <PixelCoinIcon className={iconClassName} aria-hidden />
        ) : (
          <JewelIcon className={iconClassName} aria-hidden />
        )}
        <span className="economy-balance-change-prev">{previous.toLocaleString()}</span>
        <span className="economy-balance-change-arrow" aria-hidden>
          →
        </span>
        <span className="economy-balance-change-next">{next.toLocaleString()}</span>
        <span
          className={
            delta > 0
              ? 'economy-balance-change-delta economy-balance-change-delta--gain'
              : 'economy-balance-change-delta economy-balance-change-delta--loss'
          }
        >
          ({delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()})
        </span>
      </p>
    </div>
  );
}
