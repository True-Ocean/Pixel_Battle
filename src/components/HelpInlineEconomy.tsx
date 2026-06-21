import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

const ICON_CLASS = 'help-panel-inline-icon';

export function HelpInlinePxIcon() {
  return (
    <span className="help-panel-inline-economy">
      <PixelCoinIcon className={`${ICON_CLASS} ${ICON_CLASS}--px`} aria-hidden="true" />
      <span className="sr-only">px</span>
    </span>
  );
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
