import { useEffect, useState } from 'react';
import { DECK_MAX } from '../config/balance';

interface BattleHubScreenProps {
  deckCount: number;
  onStartBattle: () => void;
}

export function BattleHubScreen({ deckCount, onStartBattle }: BattleHubScreenProps) {
  const canStart = deckCount >= DECK_MAX;
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (canStart) {
      setNotice(null);
    }
  }, [canStart]);

  const handleCpuBattle = () => {
    if (canStart) {
      onStartBattle();
      return;
    }
    setNotice(
      `デッキが${DECK_MAX}枚揃っていません。あと ${DECK_MAX - deckCount} 枚必要です（現在 ${deckCount}/${DECK_MAX} 枚）。`,
    );
  };

  return (
    <section className="screen screen-battle-hub">
      <div className="battle-hub-center">
        <div className="battle-hub-mode-wrap">
          <button type="button" className="battle-hub-mode-btn" onClick={handleCpuBattle}>
            CPU戦
          </button>
          {notice && (
            <p className="battle-hub-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
