import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { DECK_MAX } from '../config/balance';
import {
  countDeckCards,
  getBattleReadyDeckIndices,
  getDeckCards,
  getDeckDisplayName,
  isDeckBattleReady,
  isDeckSlotUnlocked,
  moveCardInLayout,
  normalizeDeckLayout,
  resolveBattleHubDeckSelection,
} from '../deckSlots';
import { computeDeckPower, isCardLost } from '../card';
import type { Card, DeckLayout } from '../types';
import { getRarityMeta } from '../config/rarity';
import { BattleCard } from './BattleCard';
import { BattleHubCardDetailOverlay } from './BattleHubCardDetailOverlay';

type BattleHubDeckStatus = 'ready' | 'incomplete';

interface SelectedSlot {
  deckIndex: number;
  slotIndex: number;
}

interface DetailTarget {
  card: Card;
  deckIndex: number;
}

export interface BattleDeckSelectScreenProps {
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  onStartBattle: (deckIndex: number) => void;
  onBack: () => void;
  onGoToMyDeck: (deckIndex: number, cardId: string) => void;
  onReorderDeckAt: (deckIndex: number, layout: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
}

export function BattleDeckSelectScreen({
  decks,
  deckNames,
  unlockedDeckCount,
  lastBattleDeckIndex,
  onStartBattle,
  onBack,
  onGoToMyDeck,
  onReorderDeckAt,
  onMoveCardBetweenDecks,
}: BattleDeckSelectScreenProps) {
  const readyIndices = useMemo(
    () => getBattleReadyDeckIndices(decks, unlockedDeckCount),
    [decks, unlockedDeckCount],
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex),
  );
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  useEffect(() => {
    setSelectedIndex(resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex));
  }, [readyIndices, lastBattleDeckIndex]);

  const canStart =
    selectedIndex != null && readyIndices.length > 0 && selectedSlot == null;

  const handleStartBattle = () => {
    if (selectedIndex != null && selectedSlot == null) {
      onStartBattle(selectedIndex);
    }
  };

  const deckRows = useMemo(() => {
    return Array.from({ length: unlockedDeckCount }, (_, index) => {
      const layout = normalizeDeckLayout(decks[index] ?? []);
      const cardCount = countDeckCards(layout);
      const status: BattleHubDeckStatus = isDeckBattleReady(layout)
        ? 'ready'
        : 'incomplete';
      return {
        index,
        layout,
        status,
        cardCount,
        power: computeDeckPower(getDeckCards(layout)),
      };
    });
  }, [decks, unlockedDeckCount]);

  const handleDeckSelect = useCallback(
    (index: number, status: BattleHubDeckStatus) => {
      if (selectedSlot != null || status !== 'ready') return;
      setSelectedIndex(index);
    },
    [selectedSlot],
  );

  const executeMove = useCallback(
    (from: SelectedSlot, to: SelectedSlot) => {
      if (
        from.deckIndex === to.deckIndex &&
        from.slotIndex === to.slotIndex
      ) {
        return;
      }
      if (from.deckIndex === to.deckIndex) {
        const layout = normalizeDeckLayout(decks[from.deckIndex] ?? []);
        onReorderDeckAt(
          from.deckIndex,
          moveCardInLayout(layout, from.slotIndex, to.slotIndex),
        );
        return;
      }
      onMoveCardBetweenDecks(
        from.deckIndex,
        from.slotIndex,
        to.deckIndex,
        to.slotIndex,
      );
    },
    [decks, onMoveCardBetweenDecks, onReorderDeckAt],
  );

  const handleSlotTap = useCallback(
    (deckIndex: number, slotIndex: number, card: Card | null) => {
      if (!isDeckSlotUnlocked(deckIndex, unlockedDeckCount)) return;

      if (!selectedSlot) {
        if (!card) return;
        setSelectedSlot({ deckIndex, slotIndex });
        return;
      }

      if (
        selectedSlot.deckIndex === deckIndex &&
        selectedSlot.slotIndex === slotIndex
      ) {
        if (card) {
          setDetailTarget({ card, deckIndex });
        }
        setSelectedSlot(null);
        return;
      }

      executeMove(selectedSlot, { deckIndex, slotIndex });
      setSelectedSlot(null);
    },
    [executeMove, selectedSlot, unlockedDeckCount],
  );

  return (
    <section
      className={`screen screen-battle-hub screen-battle-hub-deck-select${
        selectedSlot ? ' screen-battle-hub-card-selected' : ''
      }`}
    >
      <div className="battle-hub-deck-select-head">
        <button
          type="button"
          className="battle-hub-back-btn"
          onClick={() => {
            setSelectedSlot(null);
            onBack();
          }}
        >
          モード選択に戻る
        </button>
        <h2 className="battle-hub-deck-select-title">デッキ選択</h2>
      </div>

      <div className="battle-hub-body">
        <ul className="battle-hub-deck-list" aria-label="バトル用デッキ">
          {deckRows.map(({ index, layout, status, cardCount, power }) => {
            const deckLabel = getDeckDisplayName(index, deckNames);
            const isSelected = status === 'ready' && selectedIndex === index;
            const isSelectable = status === 'ready';
            const statusLabel =
              status === 'incomplete'
                ? `${cardCount}/${DECK_MAX}枚`
                : `戦力 ${power}`;
            const tileLabel =
              status === 'ready'
                ? `${deckLabel} 戦力${power}`
                : `${deckLabel} ${cardCount}/${DECK_MAX}枚`;

            return (
              <li key={index}>
                <div
                  className={[
                    'battle-hub-deck-tile',
                    isSelected ? 'is-selected' : '',
                    status === 'incomplete' ? 'is-incomplete' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={tileLabel}
                >
                  <button
                    type="button"
                    className="battle-hub-deck-tile-select-area"
                    disabled={!isSelectable || selectedSlot != null}
                    aria-pressed={isSelectable ? isSelected : undefined}
                    onClick={() => handleDeckSelect(index, status)}
                  >
                    <div className="battle-hub-deck-tile-head">
                      <span className="battle-hub-deck-label">{deckLabel}</span>
                      <span className="battle-hub-deck-status">
                        {status === 'ready' ? (
                          <>
                            戦力 <strong>{power}</strong>
                          </>
                        ) : (
                          <>
                            <strong>{cardCount}</strong>/{DECK_MAX}枚
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                  <div className="battle-hub-deck-icons">
                    {layout.map((card, slotIndex) => {
                      const isSlotSelected =
                        selectedSlot != null &&
                        selectedSlot.deckIndex === index &&
                        selectedSlot.slotIndex === slotIndex;
                      const isMoveTarget =
                        selectedSlot != null && !isSlotSelected;

                      if (!card) {
                        return (
                          <button
                            key={`empty-${slotIndex}`}
                            type="button"
                            className={[
                              'battle-hub-deck-icon',
                              'battle-hub-deck-icon--empty',
                              isMoveTarget ? 'is-move-target' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-label={`${deckLabel} 空きスロット`}
                            onClick={() => {
                              if (selectedSlot) {
                                handleSlotTap(index, slotIndex, null);
                              } else {
                                handleDeckSelect(index, status);
                              }
                            }}
                          />
                        );
                      }

                      const rarityMeta = getRarityMeta(card.rarity);
                      const cardIsLost = isCardLost(card);

                      return (
                        <button
                          key={card.id}
                          type="button"
                          className={[
                            'battle-hub-deck-icon',
                            'battle-hub-deck-icon--interactive',
                            `battle-hub-deck-icon--${card.rarity}`,
                            cardIsLost ? 'battle-hub-deck-icon--lost' : '',
                            isSlotSelected ? 'is-selected-for-move' : '',
                            isMoveTarget ? 'is-move-target' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{
                            borderColor: cardIsLost ? '#e53935' : rarityMeta.rowBorder,
                            borderWidth: rarityMeta.rowBorderWidth,
                            background: rarityMeta.rowBg,
                            boxShadow: cardIsLost
                              ? 'none'
                              : (rarityMeta.rowBoxShadow ?? 'none'),
                          } as CSSProperties}
                          aria-label={
                            cardIsLost
                              ? `${card.name}（ロスト中）`
                              : isSlotSelected
                                ? `${card.name}（移動元・もう一度タップで詳細）`
                                : card.name
                          }
                          onClick={() => handleSlotTap(index, slotIndex, card)}
                        >
                          <div className="battle-hub-deck-icon-art">
                            <BattleCard
                              name={card.name}
                              pixels={card.pixels}
                              attribute={card.attribute}
                              currentBp={card.bp}
                              variant="compact"
                              fixedSize
                              side="player"
                              rarity={card.rarity}
                            />
                          </div>
                          {cardIsLost && (
                            <span className="card-lost-badge card-lost-badge--hub" aria-hidden>
                              ロスト中
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!isSelectable && (
                    <span className="sr-only">{statusLabel}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="battle-hub-actions battle-hub-actions--deck-select">
          {selectedSlot && (
            <p className="battle-hub-deck-select-hint" role="status">
              移動先のスロットをタップしてください（同じカードをもう一度タップで詳細）
            </p>
          )}
          {readyIndices.length === 0 && (
            <p className="battle-hub-deck-select-notice" role="status">
              5枚揃ったデッキがありません。マイデッキで編成してください。
            </p>
          )}
          {readyIndices.length > 1 && selectedIndex == null && !selectedSlot && (
            <p className="battle-hub-deck-select-notice" role="status">
              使用するデッキを選んでください（デッキ名または空スロットをタップ）。
            </p>
          )}
          <button
            type="button"
            className="battle-hub-mode-btn battle-hub-start-btn"
            disabled={!canStart}
            onClick={handleStartBattle}
          >
            バトル開始
          </button>
        </div>
      </div>

      {detailTarget && (
        <BattleHubCardDetailOverlay
          card={detailTarget.card}
          onClose={() => setDetailTarget(null)}
          onGoToMyDeck={() => {
            onGoToMyDeck(detailTarget.deckIndex, detailTarget.card.id);
            setDetailTarget(null);
          }}
        />
      )}
    </section>
  );
}
