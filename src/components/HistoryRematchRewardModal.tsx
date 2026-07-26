import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { AdIcon } from './AdIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface HistoryRematchRewardModalProps {
  survivorCards: Card[];
  pixelAmount: number;
  showVictoryDoubleAd?: boolean;
  alwaysDoubleRewards?: boolean;
  /** 広告視聴直後。2倍表示と案内を出し、ゲットで2倍付与する */
  doubleRewardsFromAd?: boolean;
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
  survivorCards,
  pixelAmount,
  showVictoryDoubleAd = false,
  alwaysDoubleRewards = false,
  doubleRewardsFromAd = false,
  onClaim,
  onRequestVictoryDoubleAd,
}: HistoryRematchRewardModalProps) {
  const showDoubleBadge = alwaysDoubleRewards || doubleRewardsFromAd;

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

        {doubleRewardsFromAd && (
          <p className="graveyard-pick-double-banner" role="status">
            広告視聴で報酬が2倍になりました！
          </p>
        )}

        {survivorCards.length > 0 && (
          <section
            className="graveyard-pick-section"
            aria-labelledby="history-rematch-reward-survivor"
          >
            <h3
              id="history-rematch-reward-survivor"
              className="graveyard-pick-section-title"
            >
              生存報酬（確定）
            </h3>
            <div className="graveyard-pick-survivor-row">
              <ul
                className="graveyard-pick-survivor-icons"
                aria-label="生存カード"
              >
                {survivorCards.map((card) => (
                  <li key={card.id} className="graveyard-pick-survivor-icon">
                    <CardPreview pixels={card.pixels} />
                  </li>
                ))}
              </ul>
              <span className="graveyard-pick-survivor-total">
                <PixelReward amount={pixelAmount} />
                {showDoubleBadge && <RewardDoubleBadge />}
              </span>
            </div>
          </section>
        )}

        <button
          type="button"
          className="graveyard-pick-confirm"
          onClick={() =>
            onClaim({
              doubleRewards: showDoubleBadge || undefined,
            })
          }
        >
          <span className="graveyard-pick-confirm-reward">
            <PixelReward
              amount={pixelAmount}
              iconClassName="graveyard-pick-coin-icon graveyard-pick-coin-icon--confirm"
            />
            {showDoubleBadge && <RewardDoubleBadge />}
            <span className="graveyard-pick-confirm-get">ゲット！</span>
          </span>
        </button>

        {showVictoryDoubleAd &&
          !doubleRewardsFromAd &&
          onRequestVictoryDoubleAd && (
            <button
              type="button"
              className="graveyard-pick-double-ad"
              onClick={onRequestVictoryDoubleAd}
            >
              報酬2倍
              <AdIcon className="graveyard-pick-ad-icon" />
            </button>
          )}
      </div>
    </div>,
    document.body,
  );
}
