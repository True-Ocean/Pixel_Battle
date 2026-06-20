import { getAttributeMeta } from '../config/attributes';
import type { Attribute } from '../types';
import { AttributeBadge } from './AttributeBadge';

interface ShardBalanceChangeProps {
  attribute: Attribute;
  previous: number;
  next: number;
}

export function ShardBalanceChange({
  attribute,
  previous,
  next,
}: ShardBalanceChangeProps) {
  const delta = next - previous;
  if (delta === 0) return null;

  const meta = getAttributeMeta(attribute);

  return (
    <div className="economy-balance-change shard-balance-change">
      <p
        className="economy-balance-change-line"
        aria-label={`${meta.label}のかけら ${previous.toLocaleString()}から${next.toLocaleString()}へ`}
      >
        <span className="economy-balance-change-label">{meta.label}のかけら</span>
        <AttributeBadge
          attribute={attribute}
          className="shard-balance-change-badge"
        />
        <span className="economy-balance-change-prev">{previous.toLocaleString()}</span>
        <span className="economy-balance-change-arrow" aria-hidden>
          →
        </span>
        <span className="economy-balance-change-next">{next.toLocaleString()}</span>
        <span className="economy-balance-change-delta economy-balance-change-delta--gain">
          (+{delta.toLocaleString()})
        </span>
      </p>
    </div>
  );
}
