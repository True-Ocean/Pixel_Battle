import type { MissionReward } from '../mission/types';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

interface MissionRewardChipsProps {
  reward: MissionReward;
  className?: string;
}

export function MissionRewardChips({ reward, className }: MissionRewardChipsProps) {
  const hasPx = reward.px != null && reward.px > 0;
  const hasJewels = reward.jewels != null && reward.jewels > 0;
  const hasUniversalShards = reward.universalShards != null && reward.universalShards > 0;
  if (!hasPx && !hasJewels && !hasUniversalShards) return null;

  return (
    <div
      className={[
        'mission-reward-chips',
        hasPx ? 'mission-reward-chips--has-px' : 'mission-reward-chips--jewels-only',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mission-reward-chip-slot mission-reward-chip-slot--px">
        {hasPx ? (
          <span className="mission-reward-chip mission-reward-chip--px">
            <PixelCoinIcon className="mission-reward-chip-icon" aria-hidden="true" />
            <span className="sr-only">ピクセルコイン</span>
            <span>{reward.px!.toLocaleString()}</span>
          </span>
        ) : hasJewels ? (
          <span className="mission-reward-chip mission-reward-chip--jewels">
            <JewelIcon className="mission-reward-chip-icon" aria-hidden="true" />
            <span className="sr-only">ジュエル</span>
            <span>{reward.jewels!.toLocaleString()}</span>
          </span>
        ) : (
          <span className="mission-reward-chip mission-reward-chip--shards">
            <UniversalShardIcon className="mission-reward-chip-icon" aria-hidden="true" />
            <span className="sr-only">汎用かけら</span>
            <span>{reward.universalShards!.toLocaleString()}</span>
          </span>
        )}
      </div>
      {hasPx && hasJewels && (
        <div className="mission-reward-chip-slot mission-reward-chip-slot--jewels">
          <span className="mission-reward-chip mission-reward-chip--jewels">
            <JewelIcon className="mission-reward-chip-icon" aria-hidden="true" />
            <span className="sr-only">ジュエル</span>
            <span>{reward.jewels!.toLocaleString()}</span>
          </span>
        </div>
      )}
      {hasUniversalShards && hasPx && (
        <div className="mission-reward-chip-slot mission-reward-chip-slot--shards">
          <span className="mission-reward-chip mission-reward-chip--shards">
            <UniversalShardIcon className="mission-reward-chip-icon" aria-hidden="true" />
            <span className="sr-only">汎用かけら</span>
            <span>{reward.universalShards!.toLocaleString()}</span>
          </span>
        </div>
      )}
    </div>
  );
}
