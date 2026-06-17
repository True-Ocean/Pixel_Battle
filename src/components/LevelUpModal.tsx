import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE_16 } from '../config/balance';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import { getAttributeMeta } from '../config/attributes';
import {
  calcLevelUpJewelBonus,
  JEWELS_PER_LEVEL,
} from '../config/economy';
import { collectLevelUpRewards } from '../config/progressionUnlocks';
import { AttributeBadge } from './AttributeBadge';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { TalismanIcon } from './TalismanIcon';

interface LevelUpModalProps {
  fromLevel: number;
  toLevel: number;
  totalPixelsGranted: number;
  totalJewelsGranted: number;
  onClose: () => void;
}

function computeJewelBreakdown(fromLevel: number, toLevel: number) {
  let base = 0;
  let bonus = 0;
  const start = Math.floor(fromLevel);
  const end = Math.floor(toLevel);
  for (let level = start + 1; level <= end; level++) {
    base += JEWELS_PER_LEVEL;
    bonus += calcLevelUpJewelBonus(level);
  }
  return { base, bonus };
}

function buildRewardAriaLabel(
  totalPixelsGranted: number,
  jewelBreakdown: { base: number; bonus: number },
): string {
  const parts: string[] = [];
  if (totalPixelsGranted > 0) {
    parts.push(`${totalPixelsGranted.toLocaleString()}ピクセルコイン`);
  }
  if (jewelBreakdown.bonus > 0) {
    parts.push(
      `${jewelBreakdown.base.toLocaleString()}ジュエル・更に${jewelBreakdown.bonus.toLocaleString()}ジュエル`,
    );
  } else if (jewelBreakdown.base > 0) {
    parts.push(`${jewelBreakdown.base.toLocaleString()}ジュエル`);
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
  const jewelBreakdown = useMemo(
    () => computeJewelBreakdown(fromLevel, toLevel),
    [fromLevel, toLevel],
  );

  const extraRewards = useMemo(() => {
    return collectLevelUpRewards(fromLevel, toLevel).flatMap(({ level, rewards }) =>
      rewards
        .filter((reward) => reward.kind !== 'pixels' && reward.kind !== 'jewels')
        .map((reward) => ({ level, ...reward })),
    );
  }, [fromLevel, toLevel]);

  const rewardAriaLabel = buildRewardAriaLabel(totalPixelsGranted, jewelBreakdown);
  const showJewels = totalJewelsGranted > 0;

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
        {rewardAriaLabel && (
          <p className="level-up-reward-main" aria-label={rewardAriaLabel}>
            {totalPixelsGranted > 0 && (
              <span className="level-up-reward-px">
                <PixelCoinIcon className="level-up-reward-coin-icon" />
                <span>{totalPixelsGranted.toLocaleString()}</span>
              </span>
            )}
            {totalPixelsGranted > 0 && showJewels && (
              <span className="level-up-reward-sep">・</span>
            )}
            {showJewels && jewelBreakdown.bonus > 0 ? (
              <>
                <span className="level-up-reward-jewels">
                  <JewelIcon className="level-up-reward-jewel-icon" />
                  <span>{jewelBreakdown.base.toLocaleString()}</span>
                </span>
                <span className="level-up-reward-sep">・更に</span>
                <span className="level-up-reward-jewels">
                  <JewelIcon className="level-up-reward-jewel-icon" />
                  <span>{jewelBreakdown.bonus.toLocaleString()}</span>
                </span>
              </>
            ) : showJewels ? (
              <span className="level-up-reward-jewels">
                <JewelIcon className="level-up-reward-jewel-icon" />
                <span>{totalJewelsGranted.toLocaleString()}</span>
              </span>
            ) : null}
            <span className="level-up-reward-get"> ゲット！</span>
          </p>
        )}
        {extraRewards.length > 0 && (
          <ul className="level-up-extra-list">
            {extraRewards.map((reward) => {
              const attributeAriaLabel =
                reward.kind === 'attribute' && reward.attribute
                  ? `新しい${getAttributeMeta(reward.attribute).ariaName}が解放されました！`
                  : reward.label;

              const paletteAriaLabel =
                reward.kind === 'palette' && reward.paletteIndex != null
                  ? `お絵描きで${PALETTE_COLOR_LABELS[reward.paletteIndex]}が使えるようになりました！`
                  : reward.label;

              const talismanAriaLabel =
                reward.kind === 'talisman'
                  ? '護符を1個プレゼントしました'
                  : reward.label;

              const lostUnlockAriaLabel =
                reward.kind === 'lost_unlock' ? reward.label : reward.label;

              const ariaLabel =
                reward.kind === 'attribute'
                  ? attributeAriaLabel
                  : reward.kind === 'palette'
                    ? paletteAriaLabel
                    : reward.kind === 'talisman'
                      ? talismanAriaLabel
                      : reward.kind === 'lost_unlock'
                        ? lostUnlockAriaLabel
                        : reward.label;

              return (
                <li
                  key={`${reward.level}-${reward.kind}-${reward.label}-${reward.attribute ?? ''}`}
                  className={`level-up-extra-item${reward.pending ? ' is-pending' : ''}`}
                  aria-label={ariaLabel}
                >
                  {reward.kind === 'attribute' && reward.attribute ? (
                    <span className="level-up-attribute-unlock">
                      新しい属性
                      <AttributeBadge
                        attribute={reward.attribute}
                        className="level-up-attribute-badge"
                        size="deck"
                      />
                      が解放されました！
                    </span>
                  ) : reward.kind === 'palette' && reward.paletteIndex != null ? (
                    <span className="level-up-palette-unlock">
                      お絵描きで
                      <span
                        className="level-up-palette-unlock-icon"
                        style={{ background: PALETTE_16[reward.paletteIndex] }}
                        aria-hidden="true"
                      />
                      が使えるようになりました！
                    </span>
                  ) : reward.kind === 'talisman' ? (
                    <span className="level-up-talisman-unlock">
                      護符
                      <TalismanIcon
                        className="level-up-talisman-unlock-icon"
                        aria-hidden="true"
                      />
                      を1個プレゼントしました
                    </span>
                  ) : reward.kind === 'lost_unlock' ? (
                    <span className="level-up-lost-unlock">{reward.label}</span>
                  ) : (
                    reward.label
                  )}
                  {reward.pending ? (
                    <span className="level-up-reward-pending">（準備中）</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="level-up-bp-notice">全カードのBPがアップしました！</p>
        <button type="button" className="level-up-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
