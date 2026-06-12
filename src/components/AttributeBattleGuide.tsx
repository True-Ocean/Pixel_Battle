import { getAttributeMeta } from '../config/attributes';
import type { Attribute } from '../types';

interface AttributeBattleGuideProps {
  attribute: Attribute;
}

export function AttributeBattleGuide({ attribute }: AttributeBattleGuideProps) {
  const meta = getAttributeMeta(attribute);
  const guide = meta.battleGuide.trim();
  if (!guide) return null;

  return (
    <details className="deck-detail-card-guide">
      <summary className="deck-detail-card-guide-summary">
        詳しい説明を見る
      </summary>
      <div className="deck-detail-card-guide-body" role="note">
        {guide}
      </div>
    </details>
  );
}
