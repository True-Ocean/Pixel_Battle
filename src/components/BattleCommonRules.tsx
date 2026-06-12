import { BATTLE_COMMON_GUIDE } from '../config/battleGuideCommon';

export function BattleCommonRules() {
  return (
    <details className="deck-detail-card-guide deck-detail-card-guide-common">
      <summary className="deck-detail-card-guide-summary">
        共通ルール
      </summary>
      <div className="deck-detail-card-guide-body" role="note">
        {BATTLE_COMMON_GUIDE}
      </div>
    </details>
  );
}
