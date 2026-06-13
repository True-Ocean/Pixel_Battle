import { DECK_MAX } from '../config/balance';

interface BattleHubScreenProps {
  deckCount: number;
  onStartBattle: () => void;
}

export function BattleHubScreen({ deckCount, onStartBattle }: BattleHubScreenProps) {
  const canStart = deckCount >= DECK_MAX;

  return (
    <section className="screen screen-battle-hub">
      <div className="battle-hub-body">
        <p className="battle-hub-lead muted">
          CPU とのバトルに挑戦します。デッキを {DECK_MAX} 枚そろえてから開始してください。
        </p>
        {!canStart && (
          <p className="battle-hub-notice muted">
            あと {DECK_MAX - deckCount} 枚必要です（現在 {deckCount}/{DECK_MAX} 枚）
          </p>
        )}
      </div>
      <div className="actions battle-hub-actions">
        <button
          type="button"
          className="primary"
          disabled={!canStart}
          onClick={onStartBattle}
        >
          バトル開始
        </button>
      </div>
    </section>
  );
}
