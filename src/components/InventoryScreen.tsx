import { ATTRIBUTE_META } from '../config/attributes';
import type { Attribute, UserInventory } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_META) as Attribute[];
const SHARD_NAME_SUFFIX = 'のかけら';

function formatItemCount(count: number): string {
  return `${count.toLocaleString()}個`;
}

interface InventoryScreenProps {
  inventory: UserInventory;
}

export function InventoryScreen({ inventory }: InventoryScreenProps) {
  return (
    <section className="screen screen-inventory">
      <div className="inventory-scroll">
        <h1 className="inventory-title">所持品</h1>

        <section className="inventory-section" aria-labelledby="inventory-items">
          <h2 id="inventory-items" className="inventory-section-title">
            アイテム
          </h2>
          <div className="inventory-section-body">
            <div
              className="inventory-item-row"
              aria-label={`護符 ${formatItemCount(inventory.talisman)}`}
            >
              <span className="inventory-item-icon inventory-item-icon--talisman" aria-hidden="true">
                <TalismanIcon className="inventory-item-icon-svg inventory-item-icon-svg--talisman" />
              </span>
              <span className="inventory-item-label">護符</span>
              <span className="inventory-item-value">
                {formatItemCount(inventory.talisman)}
              </span>
            </div>
          </div>
        </section>

        <details className="inventory-shards" open>
          <summary className="inventory-shards-summary">属性のかけら</summary>
          <ul className="inventory-shard-list">
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
            {ALL_ATTRIBUTES.map((attribute) => {
              const meta = ATTRIBUTE_META[attribute];
              const count = inventory.limitBreakShards[attribute] ?? 0;
              return (
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
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
