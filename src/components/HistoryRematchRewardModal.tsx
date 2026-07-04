import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PixelCoinIcon } from './PixelCoinIcon';

interface HistoryRematchRewardModalProps {
  winner: 'player' | 'cpu';
  pixelAmount: number;
  showVictoryDoubleAd?: boolean;
  alwaysDoubleRewards?: boolean;
  onClaim: (options?: { doubleRewards?: boolean }) => void;
  onRequestVictoryDoubleAd?: () => void;
}

function PixelReward({
  amount,
  iconClassName = 'graveyard-pick-coin-icon',
}: {
  amount: number;
  iconClassName?: string;
}) {
  return (
    <span className="graveyard-pick-px-reward">
      <PixelCoinIcon className={iconClassName} aria-hidden="true" />
      <span className="sr-only">ピクセルコイン</span>
      {amount.toLocaleString()}
    </span>
  );
}

function RewardDoubleBadge() {
  return <span className="graveyard-pick-reward-double">× 2</span>;
}

export function HistoryRematchRewardModal({
  winner,
  pixelAmount,
  showVictoryDoubleAd = false,
  alwaysDoubleRewards = false,
  onClaim,
  onRequestVictoryDoubleAd,
}: HistoryRematchRewardModalProps) {
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const sectionTitle = winner === 'player' ? '勝利報酬' : '敗北報酬';

  return createPortal(
    <div className="graveyard-pick-backdrop">
      <div
        className="graveyard-pick-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-rematch-reward-title"
      >
        <h2 id="history-rematch-reward-title" className="graveyard-pick-title">
          バトル報酬
        </h2>

        <section
          className="graveyard-pick-section"
          aria-labelledby="history-rematch-reward-amount"
        >
          <h3
            id="history-rematch-reward-amount"
            className="graveyard-pick-section-title"
          >
            {sectionTitle}
          </h3>
          <div className="graveyard-pick-survivor-row history-rematch-reward-row">
            <span className="history-rematch-reward-label">
              {winner === 'player'
                ? '通常バトルの2倍'
                : '通常バトルと同等'}
            </span>
            <span className="graveyard-pick-survivor-total">
              <PixelReward amount={pixelAmount} />
              {alwaysDoubleRewards && <RewardDoubleBadge />}
            </span>
          </div>
        </section>

        <button
          type="button"
          className="graveyard-pick-confirm"
          onClick={() => onClaim()}
        >
          <span className="graveyard-pick-confirm-reward">
            <PixelReward
              amount={pixelAmount}
              iconClassName="graveyard-pick-coin-icon graveyard-pick-coin-icon--confirm"
            />
            {alwaysDoubleRewards && <RewardDoubleBadge />}
            <span className="graveyard-pick-confirm-get">ゲット！</span>
          </span>
        </button>

        {showVictoryDoubleAd && onRequestVictoryDoubleAd && (
          <button
            type="button"
            className="graveyard-pick-double-ad"
            onClick={onRequestVictoryDoubleAd}
          >
            報酬2倍　🎬
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
