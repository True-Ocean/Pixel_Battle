import type { ReactNode } from 'react';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

const ICON_CLASS = 'help-panel-inline-icon';

interface InlinePxCostProps {
  amount: number;
  className?: string;
  iconClassName?: string;
}

export function InlinePxCost({
  amount,
  className = 'help-panel-inline-economy',
  iconClassName = `${ICON_CLASS} ${ICON_CLASS}--px`,
}: InlinePxCostProps) {
  return (
    <span className={className}>
      <PixelCoinIcon className={iconClassName} aria-hidden="true" />
      <span className="help-panel-inline-economy-value">{amount.toLocaleString()}</span>
      <span className="sr-only">ピクセルコイン</span>
    </span>
  );
}

export function HelpInlinePxIcon() {
  return (
    <span className="help-panel-inline-economy">
      <PixelCoinIcon className={`${ICON_CLASS} ${ICON_CLASS}--px`} aria-hidden="true" />
      <span className="sr-only">ピクセルコイン</span>
    </span>
  );
}

interface HelpInlinePxCostProps {
  amount: number;
}

export function HelpInlinePxCost({ amount }: HelpInlinePxCostProps) {
  return <InlinePxCost amount={amount} />;
}

export function InlinePxShortageMessage({ amount }: { amount: number }) {
  return (
    <>
      <InlinePxCost
        amount={amount}
        className="inline-economy-px-shortage"
        iconClassName="inline-economy-px-shortage-icon"
      />
      {' '}が不足しています。
    </>
  );
}

export function inlinePxShortageError(amount: number): ReactNode {
  return <InlinePxShortageMessage amount={amount} />;
}

interface HelpInlineJewelCostProps {
  amount: number;
}

export function HelpInlineJewelCost({ amount }: HelpInlineJewelCostProps) {
  return (
    <span className="help-panel-inline-economy">
      <JewelIcon className={`${ICON_CLASS} ${ICON_CLASS}--jewel`} aria-hidden="true" />
      <span className="help-panel-inline-economy-value">{amount}</span>
      <span className="sr-only">ジュエル</span>
    </span>
  );
}
