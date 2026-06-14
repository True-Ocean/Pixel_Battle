import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collectLevelUpRewards } from '../config/progressionUnlocks';

interface LevelUpModalProps {
  fromLevel: number;
  toLevel: number;
  totalPixelsGranted: number;
  onClose: () => void;
}

export function LevelUpModal({
  fromLevel,
  toLevel,
  totalPixelsGranted,
  onClose,
}: LevelUpModalProps) {
  const levelGroups = collectLevelUpRewards(fromLevel, toLevel);

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
        className="level-up-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="level-up-title" className="level-up-title">
          レベルアップ！
        </h2>
        <p className="level-up-summary">
          Lv.{fromLevel} → Lv.{toLevel}
        </p>
        <ul className="level-up-reward-list">
          {levelGroups.map(({ level, rewards }) => (
            <li key={level} className="level-up-reward-group">
              <span className="level-up-reward-level">Lv.{level}</span>
              <ul className="level-up-reward-items">
                {rewards.map((reward) => (
                  <li
                    key={`${level}-${reward.kind}-${reward.label}`}
                    className={`level-up-reward-item${reward.pending ? ' is-pending' : ''}`}
                  >
                    {reward.label}
                    {reward.pending ? (
                      <span className="level-up-reward-pending">（準備中）</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {totalPixelsGranted > 0 && (
          <p className="level-up-pixels-total">
            合計 +{totalPixelsGranted.toLocaleString()} 無償ピクセル
          </p>
        )}
        <button type="button" className="level-up-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
