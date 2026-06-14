import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collectLevelUpRewards } from '../config/progressionUnlocks';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface LevelUpModalProps {
  fromLevel: number;
  toLevel: number;
  totalPixelsGranted: number;
  totalJewelsGranted: number;
  onClose: () => void;
}

function formatRewardLine(
  totalPixelsGranted: number,
  totalJewelsGranted: number,
): string {
  const parts: string[] = [];
  if (totalPixelsGranted > 0) {
    parts.push(`${totalPixelsGranted.toLocaleString()}px`);
  }
  if (totalJewelsGranted > 0) {
    parts.push(`${totalJewelsGranted.toLocaleString()}ジュエル`);
  }
  if (parts.length === 0) return '';
  return `${parts.join('・')} ゲット！`;
}

export function LevelUpModal({
  fromLevel,
  toLevel,
  totalPixelsGranted,
  totalJewelsGranted,
  onClose,
}: LevelUpModalProps) {
  const extraRewards = useMemo(() => {
    return collectLevelUpRewards(fromLevel, toLevel).flatMap(({ level, rewards }) =>
      rewards
        .filter((reward) => reward.kind !== 'pixels' && reward.kind !== 'jewels')
        .map((reward) => ({ level, ...reward })),
    );
  }, [fromLevel, toLevel]);

  const rewardLine = formatRewardLine(totalPixelsGranted, totalJewelsGranted);

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
    <div className="level-up-backdrop" onClick={onClose}>
      <div
        className="level-up-panel level-up-panel--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="level-up-title" className="level-up-title">
          レベルアップ！（Lv.{fromLevel}→Lv.{toLevel}）
        </h2>
        {rewardLine && (
          <p className="level-up-reward-main" aria-label={rewardLine}>
            {totalPixelsGranted > 0 && (
              <span className="level-up-reward-px">
                <PixelCoinIcon className="level-up-reward-coin-icon" />
                <span>{totalPixelsGranted.toLocaleString()}</span>
              </span>
            )}
            {totalPixelsGranted > 0 && totalJewelsGranted > 0 && (
              <span className="level-up-reward-sep">・</span>
            )}
            {totalJewelsGranted > 0 && (
              <span className="level-up-reward-jewels">
                <span>{totalJewelsGranted.toLocaleString()}</span>
                <JewelIcon className="level-up-reward-jewel-icon" />
              </span>
            )}
            <span className="level-up-reward-get"> ゲット！</span>
          </p>
        )}
        {extraRewards.length > 0 && (
          <ul className="level-up-extra-list">
            {extraRewards.map((reward) => (
              <li
                key={`${reward.level}-${reward.kind}-${reward.label}`}
                className={`level-up-extra-item${reward.pending ? ' is-pending' : ''}`}
              >
                {reward.label}
                {reward.pending ? (
                  <span className="level-up-reward-pending">（準備中）</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="level-up-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
