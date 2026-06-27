import { PALETTE_16 } from '../config/balance';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import { getAttributeMeta } from '../config/attributes';
import {
  calcLevelUpJewels,
  calcLevelUpPixels,
} from '../config/economy';
import type { LevelUpRewardEntry } from '../config/progressionUnlocks';
import { AttributeBadge } from './AttributeBadge';
import { EditorShopFeatureIcon } from './EditorToolIcon';
import { JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

interface LevelUpRewardIconProps {
  reward: LevelUpRewardEntry;
  level: number;
}

function formatCanvasUnlockLabel(canvasSize: number): string {
  return `キャンバス${canvasSize}×${canvasSize}解放`;
}

function rewardAriaLabel(reward: LevelUpRewardEntry): string {
  if (reward.kind === 'attribute' && reward.attribute) {
    return `${getAttributeMeta(reward.attribute).label}属性解放`;
  }
  if (reward.kind === 'palette') {
    return 'パレット解放';
  }
  if (reward.kind === 'tool' && reward.editorFeature) {
    return 'お絵描きツール解放';
  }
  if (reward.kind === 'canvas' && reward.canvasSize != null) {
    return formatCanvasUnlockLabel(reward.canvasSize);
  }
  if (reward.kind === 'deck_unlock' && reward.deckUnlockLabel) {
    return reward.deckUnlockLabel;
  }
  if (reward.kind === 'limit_break' && reward.universalShardAmount != null) {
    return `汎のかけら${reward.universalShardAmount.toLocaleString()}`;
  }
  if (reward.kind === 'talisman' && reward.talismanAmount != null) {
    return `護符${reward.talismanAmount.toLocaleString()}個`;
  }
  return reward.label;
}

export function LevelUpRewardIcon({ reward, level }: LevelUpRewardIconProps) {
  const aria = rewardAriaLabel(reward);

  if (reward.kind === 'pixels') {
    return (
      <span className="level-reward-chip level-reward-chip--pixels" title={aria}>
        <PixelCoinIcon className="level-reward-icon-coin" aria-hidden="true" />
        <span className="level-reward-icon-value">
          {calcLevelUpPixels(level).toLocaleString()}
        </span>
      </span>
    );
  }

  if (reward.kind === 'jewels') {
    return (
      <span className="level-reward-chip level-reward-chip--jewels" title={aria}>
        <JewelIcon className="level-reward-icon-jewel" aria-hidden="true" />
        <span className="level-reward-icon-value">
          {calcLevelUpJewels(level).toLocaleString()}
        </span>
      </span>
    );
  }

  if (reward.kind === 'attribute' && reward.attribute) {
    return (
      <span className="level-reward-chip level-reward-chip--attribute" title={aria}>
        <AttributeBadge
          attribute={reward.attribute}
          className="level-reward-icon-attribute"
          size="deck"
        />
        <span className="level-reward-chip-text">属性解放</span>
      </span>
    );
  }

  if (reward.kind === 'palette' && reward.paletteIndex != null) {
    return (
      <span className="level-reward-chip level-reward-chip--palette" title={aria}>
        <span
          className="level-reward-icon-palette"
          style={{ background: PALETTE_16[reward.paletteIndex] }}
          aria-hidden="true"
        />
        <span className="level-reward-chip-text">パレット解放</span>
      </span>
    );
  }

  if (reward.kind === 'talisman' && reward.talismanAmount != null) {
    return (
      <span className="level-reward-chip level-reward-chip--talisman" title={aria}>
        <TalismanIcon className="level-reward-icon-talisman" aria-hidden="true" />
        <span className="level-reward-icon-value">
          {reward.talismanAmount.toLocaleString()}
        </span>
      </span>
    );
  }

  if (reward.kind === 'tool' && reward.editorFeature) {
    return (
      <span className="level-reward-chip level-reward-chip--tool" title={aria}>
        <span className="level-reward-chip-text">お絵描きツール</span>
        <EditorShopFeatureIcon
          feature={reward.editorFeature}
          className="level-reward-editor-tool-icon"
        />
        <span className="level-reward-chip-text">解放</span>
      </span>
    );
  }

  if (reward.kind === 'canvas' && reward.canvasSize != null) {
    return (
      <span className="level-reward-chip level-reward-chip--text" title={aria}>
        <span className="level-reward-chip-text">
          {formatCanvasUnlockLabel(reward.canvasSize)}
        </span>
      </span>
    );
  }

  if (reward.kind === 'deck_unlock' && reward.deckUnlockLabel) {
    return (
      <span className="level-reward-chip level-reward-chip--text" title={aria}>
        <span className="level-reward-chip-text">{reward.deckUnlockLabel}</span>
      </span>
    );
  }

  if (reward.kind === 'limit_break' && reward.universalShardAmount != null) {
    return (
      <span className="level-reward-chip level-reward-chip--shards" title={aria}>
        <UniversalShardIcon className="level-reward-universal-shard-icon" />
        <span className="level-reward-chip-text">
          のかけら{reward.universalShardAmount.toLocaleString()}
        </span>
      </span>
    );
  }

  return (
    <span className="level-reward-chip level-reward-chip--text" title={aria}>
      <span className="level-reward-chip-text">…</span>
    </span>
  );
}
