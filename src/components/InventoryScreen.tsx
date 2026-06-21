import { ATTRIBUTE_META } from '../config/attributes';
import type { Attribute, UserInventory } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_META) as Attribute[];
const SHARD_NAME_SUFFIX = 'のかけら';
const SHARD_SECTION_HINT = 'カードの限界突破のために消費する素材';

function formatItemCount(count: number): string {
  return `${count.toLocaleString()}個`;
}

interface InventoryScreenProps {
  inventory: UserInventory;
  equippedTalismanCount: number;
}

export function InventoryScreen({
  inventory,
  equippedTalismanCount,
}: InventoryScreenProps) {
  const ownedAttributeShards = ALL_ATTRIBUTES.flatMap((attribute) => {
    const count = inventory.limitBreakShards[attribute] ?? 0;
    if (count <= 0) return [];
    return [{ attribute, meta: ATTRIBUTE_META[attribute], count }];
  });
  const hasUniversalShards = inventory.limitBreakUniversal > 0;
  const hasAnyShards = hasUniversalShards || ownedAttributeShards.length > 0;
  const hasUnusedTalisman = inventory.talisman > 0;
  const hasEquippedTalisman = equippedTalismanCount > 0;
  const hasTalisman = hasUnusedTalisman || hasEquippedTalisman;
  const isEmpty = !hasTalisman && !hasAnyShards;

  return (
    <section className="screen screen-inventory">
      <div className="inventory-scroll">
        <h1 className="inventory-title">所持品</h1>

        {isEmpty && (
          <p className="inventory-empty muted">所持しているアイテムはありません。</p>
        )}

        {hasTalisman && (
          <section className="inventory-section" aria-labelledby="inventory-items">
            <h2 id="inventory-items" className="inventory-section-title">
              アイテム
            </h2>
            <div className="inventory-section-body">
              {hasUnusedTalisman && (
                <div
                  className="inventory-item-row"
                  aria-label={`護符（未使用） ${formatItemCount(inventory.talisman)}`}
                >
                  <span
                    className="inventory-item-icon inventory-item-icon--talisman"
                    aria-hidden="true"
                  >
                    <TalismanIcon className="inventory-item-icon-svg inventory-item-icon-svg--talisman" />
                  </span>
                  <span className="inventory-item-label">護符（未使用）</span>
                  <span className="inventory-item-value">
                    {formatItemCount(inventory.talisman)}
                  </span>
                </div>
              )}
              {hasEquippedTalisman && (
                <div
                  className="inventory-item-row"
                  aria-label={`護符（使用中） ${formatItemCount(equippedTalismanCount)}`}
                >
                  <span
                    className="inventory-item-icon inventory-item-icon--talisman inventory-item-icon--talisman-equipped"
                    aria-hidden="true"
                  >
                    <TalismanIcon className="inventory-item-icon-svg inventory-item-icon-svg--talisman" />
                  </span>
                  <span className="inventory-item-label">護符（使用中）</span>
                  <span className="inventory-item-value">
                    {formatItemCount(equippedTalismanCount)}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {hasAnyShards && (
          <details className="inventory-shards" open>
            <summary className="inventory-shards-summary">
              <span className="inventory-shards-summary-inner">
                <span className="inventory-shards-summary-title">属性のかけら</span>
                <span className="inventory-shards-summary-hint">{SHARD_SECTION_HINT}</span>
              </span>
            </summary>
            <ul className="inventory-shard-list">
              {hasUniversalShards && (
                <li
                  className="inventory-shard-row"
                  aria-label={`汎${SHARD_NAME_SUFFIX} ${formatItemCount(inventory.limitBreakUniversal)}`}
                >
                  <span className="inventory-shard-label">
                    <UniversalShardIcon />
                    <span className="inventory-shard-name">{SHARD_NAME_SUFFIX}</span>
                  </span>
                  <span className="inventory-shard-count">
                    {formatItemCount(inventory.limitBreakUniversal)}
                  </span>
                </li>
              )}
              {ownedAttributeShards.map(({ attribute, meta, count }) => (
                <li
                  key={attribute}
                  className="inventory-shard-row"
                  aria-label={`${meta.label}${SHARD_NAME_SUFFIX} ${formatItemCount(count)}`}
                >
                  <span className="inventory-shard-label">
                    <AttributeBadge attribute={attribute} />
                    <span className="inventory-shard-name">{SHARD_NAME_SUFFIX}</span>
                  </span>
                  <span className="inventory-shard-count">
                    {formatItemCount(count)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
