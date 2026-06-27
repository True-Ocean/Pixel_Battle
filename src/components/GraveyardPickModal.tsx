import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calcGraveyardPixelRewardForBattleVictory,
  calcGraveyardShardReward,
  calcSurvivorPixelsForBattleVictory,
} from '../config/economy';
import { getRarityMeta } from '../config/rarity';
import type { Attribute, Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { CardPreview } from './CardPreview';
import { ExpIcon } from './ExpIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { RarityBadge } from './RarityBadge';

interface GraveyardPickModalProps {
  survivorCards: Card[];
  graveyardCards: Card[];
  expGain: number;
  showVictoryDoubleAd?: boolean;
  alwaysDoubleRewards?: boolean;
  onPick: (card: Card, options?: { doubleRewards?: boolean }) => void;
  onRequestVictoryDoubleAd?: (card: Card) => void;
}

function ShardReward({
  attribute,
  count,
}: {
  attribute: Attribute;
  count: number;
}) {
  return (
    <span className="graveyard-pick-shard-reward">
      <AttributeBadge
        attribute={attribute}
        className="graveyard-pick-shard-badge"
      />
      <span className="graveyard-pick-shard-label">
        {count.toLocaleString()}個
      </span>
    </span>
  );
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

function ExpReward({
  amount,
  iconClassName = 'graveyard-pick-exp-icon',
}: {
  amount: number;
  iconClassName?: string;
}) {
  return (
    <span className="graveyard-pick-exp-reward">
      <ExpIcon className={iconClassName} />
      {amount.toLocaleString()}
    </span>
  );
}

function RewardDoubleBadge() {
  return <span className="graveyard-pick-reward-double">× 2</span>;
}

export function GraveyardPickModal({
  survivorCards,
  graveyardCards,
  expGain,
  showVictoryDoubleAd = false,
  alwaysDoubleRewards = false,
  onPick,
  onRequestVictoryDoubleAd,
}: GraveyardPickModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = graveyardCards.find((card) => card.id === selectedId) ?? null;
  const survivorPixels = calcSurvivorPixelsForBattleVictory(survivorCards.length);
  const graveyardPixels = selected
    ? calcGraveyardPixelRewardForBattleVictory(selected)
    : 0;
  const graveyardShards = selected ? calcGraveyardShardReward(selected) : 0;
  const totalPixels = survivorPixels + graveyardPixels;
  const confirmAriaLabel = selected ? undefined : '戦利品を選んでください';

  return createPortal(
    <div className="graveyard-pick-backdrop">
      <div
        className="graveyard-pick-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="graveyard-pick-title"
      >
        <h2 id="graveyard-pick-title" className="graveyard-pick-title">
          バトル報酬
        </h2>

        {survivorCards.length > 0 && (
          <section className="graveyard-pick-section" aria-labelledby="graveyard-pick-survivor">
            <h3 id="graveyard-pick-survivor" className="graveyard-pick-section-title">
              生存報酬（確定）
            </h3>
            <div className="graveyard-pick-survivor-row">
              <ul className="graveyard-pick-survivor-icons" aria-label="生存カード">
                {survivorCards.map((card) => (
                  <li key={card.id} className="graveyard-pick-survivor-icon">
                    <CardPreview pixels={card.pixels} />
                  </li>
                ))}
              </ul>
              <span className="graveyard-pick-survivor-total">
                <PixelReward amount={survivorPixels} />
              </span>
            </div>
          </section>
        )}

        <section className="graveyard-pick-section" aria-labelledby="graveyard-pick-loot">
          <h3 id="graveyard-pick-loot" className="graveyard-pick-section-title">
            戦利品（1枚選ぶ）
          </h3>
          <ul className="graveyard-pick-list">
            {graveyardCards.map((card) => {
              const reward = calcGraveyardPixelRewardForBattleVictory(card);
              const rarityMeta = getRarityMeta(card.rarity);
              const isSelected = card.id === selectedId;
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    className={`graveyard-pick-card graveyard-pick-card--${card.rarity}${isSelected ? ' is-selected' : ''}`}
                    style={{
                      borderColor: rarityMeta.rowBorder,
                      borderWidth: rarityMeta.rowBorderWidth,
                      background: `linear-gradient(165deg, #ffffff 0%, ${rarityMeta.rowBg} 58%, ${rarityMeta.rowBg} 100%)`,
                      boxShadow: rarityMeta.rowBoxShadow,
                    }}
                    onClick={() => setSelectedId(card.id)}
                    aria-pressed={isSelected}
                  >
                    <CardPreview pixels={card.pixels} />
                    <span className="graveyard-pick-card-meta">
                      <RarityBadge
                        rarity={card.rarity}
                        className="graveyard-pick-card-rarity"
                      />
                      <AttributeBadge attribute={card.attribute} />
                      <span className="graveyard-pick-card-name">{card.name}</span>
                    </span>
                    <span className="graveyard-pick-card-reward">
                      <PixelReward amount={reward} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <button
          type="button"
          className="graveyard-pick-confirm"
          disabled={selected == null}
          aria-label={confirmAriaLabel}
          onClick={() => {
            if (selected) onPick(selected);
          }}
        >
          {selected ? (
            <span className="graveyard-pick-confirm-reward">
              <ExpReward
                amount={expGain}
                iconClassName="graveyard-pick-exp-icon graveyard-pick-exp-icon--confirm"
              />
              {alwaysDoubleRewards && <RewardDoubleBadge />}
              <span className="graveyard-pick-reward-sep">,</span>
              <PixelReward
                amount={totalPixels}
                iconClassName="graveyard-pick-coin-icon graveyard-pick-coin-icon--confirm"
              />
              {alwaysDoubleRewards && <RewardDoubleBadge />}
              <span className="graveyard-pick-reward-sep">,</span>
              <ShardReward
                attribute={selected.attribute}
                count={graveyardShards}
              />
              {alwaysDoubleRewards && <RewardDoubleBadge />}
              <span className="graveyard-pick-confirm-get">ゲット！</span>
            </span>
          ) : (
            '戦利品を選んでください'
          )}
        </button>

        {showVictoryDoubleAd && selected && onRequestVictoryDoubleAd && (
          <button
            type="button"
            className="graveyard-pick-double-ad"
            onClick={() => onRequestVictoryDoubleAd(selected)}
          >
            報酬2倍　🎬
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
