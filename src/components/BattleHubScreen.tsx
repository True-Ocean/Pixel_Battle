import { useEffect, useMemo, useState } from 'react';
import { DECK_MAX, DECK_SLOT_COUNT } from '../config/balance';
import {
  countDeckCards,
  getBattleReadyDeckIndices,
  getDeckCards,
  getDeckDisplayName,
  isDeckBattleReady,
  isDeckSlotUnlocked,
  normalizeDeckLayout,
  resolveBattleHubDeckSelection,
} from '../deckSlots';
import { computeDeckPower } from '../card';
import type { DeckLayout } from '../types';
import { getRarityMeta } from '../config/rarity';
import { BattleCard } from './BattleCard';

type BattleHubDeckStatus = 'ready' | 'incomplete' | 'locked';

interface BattleHubScreenProps {
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  onStartBattle: (deckIndex: number) => void;
}

export function BattleHubScreen({
  decks,
  deckNames,
  unlockedDeckCount,
  lastBattleDeckIndex,
  onStartBattle,
}: BattleHubScreenProps) {
  const readyIndices = useMemo(
    () => getBattleReadyDeckIndices(decks, unlockedDeckCount),
    [decks, unlockedDeckCount],
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex),
  );

  useEffect(() => {
    setSelectedIndex(resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex));
  }, [readyIndices, lastBattleDeckIndex]);

  const canStart = selectedIndex != null && readyIndices.length > 0;

  const handleCpuBattle = () => {
    if (selectedIndex != null) {
      onStartBattle(selectedIndex);
    }
  };

  const deckRows = useMemo(() => {
    return Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
      const unlocked = isDeckSlotUnlocked(index, unlockedDeckCount);
      const layout = normalizeDeckLayout(decks[index] ?? []);
      const cardCount = countDeckCards(layout);
      let status: BattleHubDeckStatus;
      if (!unlocked) {
        status = 'locked';
      } else if (isDeckBattleReady(layout)) {
        status = 'ready';
      } else {
        status = 'incomplete';
      }
      return {
        index,
        layout,
        status,
        cardCount,
        power: computeDeckPower(getDeckCards(layout)),
      };
    });
  }, [decks, unlockedDeckCount]);

  return (
    <section className="screen screen-battle-hub">
      <div className="battle-hub-body">
        <ul className="battle-hub-deck-list" aria-label="バトル用デッキ">
          {deckRows.map(({ index, layout, status, cardCount, power }) => {
            const deckLabel = getDeckDisplayName(index, deckNames);
            const isSelected = status === 'ready' && selectedIndex === index;
            const isSelectable = status === 'ready';
            const statusLabel =
              status === 'locked'
                ? '未解放'
                : status === 'incomplete'
                  ? `${cardCount}/${DECK_MAX}枚`
                  : `戦力 ${power}`;
            const tileLabel =
              status === 'ready'
                ? `${deckLabel} 戦力${power}`
                : status === 'locked'
                  ? `${deckLabel} 未解放`
                  : `${deckLabel} ${cardCount}/${DECK_MAX}枚`;

            return (
              <li key={index}>
                <button
                  type="button"
                  className={[
                    'battle-hub-deck-tile',
                    isSelected ? 'is-selected' : '',
                    status === 'locked' ? 'is-locked' : '',
                    status === 'incomplete' ? 'is-incomplete' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={isSelectable ? isSelected : undefined}
                  aria-disabled={!isSelectable}
                  aria-label={tileLabel}
                  disabled={!isSelectable}
                  onClick={() => {
                    if (isSelectable) {
                      setSelectedIndex(index);
                    }
                  }}
                >
                  <div className="battle-hub-deck-tile-head">
                    <span className="battle-hub-deck-label">{deckLabel}</span>
                    <span className="battle-hub-deck-status">
                      {status === 'ready' ? (
                        <>
                          戦力 <strong>{power}</strong>
                        </>
                      ) : status === 'locked' ? (
                        <>
                          <span className="battle-hub-deck-lock" aria-hidden>
                            🔒
                          </span>{' '}
                          未解放
                        </>
                      ) : (
                        <>
                          <strong>{cardCount}</strong>/{DECK_MAX}枚
                        </>
                      )}
                    </span>
                  </div>
                  <div className="battle-hub-deck-icons" aria-hidden>
                    {layout.map((card, slotIndex) => {
                      if (status === 'locked') {
                        return (
                          <div
                            key={`locked-${slotIndex}`}
                            className="battle-hub-deck-icon battle-hub-deck-icon--locked"
                          />
                        );
                      }
                      if (!card) {
                        return (
                          <div
                            key={`empty-${slotIndex}`}
                            className="battle-hub-deck-icon battle-hub-deck-icon--empty"
                          />
                        );
                      }
                      const rarityMeta = getRarityMeta(card.rarity);
                      return (
                        <div
                          key={card.id}
                          className={`battle-hub-deck-icon battle-hub-deck-icon--${card.rarity}`}
                          style={{
                            borderColor: rarityMeta.rowBorder,
                            background: rarityMeta.rowBg,
                          }}
                          title={card.name}
                        >
                          <BattleCard
                            name={card.name}
                            pixels={card.pixels}
                            attribute={card.attribute}
                            currentBp={card.bp}
                            variant="compact"
                            fixedSize
                            side="player"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {!isSelectable && (
                    <span className="sr-only">{statusLabel}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="battle-hub-actions">
          <button
            type="button"
            className="battle-hub-mode-btn"
            disabled={!canStart}
            onClick={handleCpuBattle}
          >
            CPU戦
          </button>
          {readyIndices.length === 0 && (
            <p className="battle-hub-notice" role="status">
              5枚揃ったデッキがありません。マイデッキで編成してください。
            </p>
          )}
          {readyIndices.length > 1 && selectedIndex == null && (
            <p className="battle-hub-notice" role="status">
              使用するデッキを選んでください。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
