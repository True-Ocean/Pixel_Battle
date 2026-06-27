import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

interface MissionBulkClaimModalProps {
  pxGranted: number;
  jewelsGranted: number;
  universalShardsGranted: number;
  missionCount: number;
  onClose: () => void;
}

export function MissionBulkClaimModal({
  pxGranted,
  jewelsGranted,
  universalShardsGranted,
  missionCount,
  onClose,
}: MissionBulkClaimModalProps) {
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

  const hasPx = pxGranted > 0;
  const hasJewels = jewelsGranted > 0;
  const hasUniversalShards = universalShardsGranted > 0;

  return createPortal(
    <div className="mission-claim-backdrop" onClick={onClose}>
      <div
        className="mission-claim-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-claim-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="mission-claim-title" className="mission-claim-title">
          報酬を受け取りました
        </h2>
        <p className="mission-claim-meta muted">
          {missionCount}件のミッション報酬
        </p>
        <div className="mission-claim-rewards" aria-label="受取報酬">
          {hasPx && (
            <span className="mission-claim-reward mission-claim-reward--px">
              <PixelCoinIcon className="mission-claim-reward-icon" aria-hidden="true" />
              <span>{pxGranted.toLocaleString()}</span>
            </span>
          )}
          {hasJewels && (
            <span className="mission-claim-reward mission-claim-reward--jewels">
              <JewelIcon className="mission-claim-reward-icon" aria-hidden="true" />
              <span>{jewelsGranted.toLocaleString()}</span>
            </span>
          )}
          {hasUniversalShards && (
            <span className="mission-claim-reward mission-claim-reward--shards">
              <UniversalShardIcon className="mission-claim-reward-icon" aria-hidden="true" />
              <span>{universalShardsGranted.toLocaleString()}</span>
            </span>
          )}
        </div>
        <button type="button" className="mission-claim-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
