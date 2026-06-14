import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { DECK_MAX, DECK_SLOT_COUNT } from '../config/balance';
import {
  countDeckCards,
  deckHasLostCard,
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
import { findBattleHubDropTarget } from './battleHubReorder';
import { CardPreview } from './CardPreview';
import { RarityBadge } from './RarityBadge';

const BATTLE_HUB_LONG_PRESS_MS = 500;
const BATTLE_HUB_DRAG_CHIP_SIZE = 56;
const BATTLE_HUB_MOVE_THRESHOLD = 8;

type BattleHubDeckStatus = 'ready' | 'incomplete' | 'locked';

interface BattleHubDragState {
  cardId: string;
  sourceDeckIndex: number;
  fromSlotIndex: number;
  targetDeckIndex: number;
  targetSlotIndex: number;
  ghostLeft: number;
  ghostTop: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
}

interface DetailTarget {
  card: Card;
  deckIndex: number;
}

interface BattleHubScreenProps {
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  onStartBattle: (deckIndex: number) => void;
  onGoToMyDeck: (deckIndex: number, cardId: string) => void;
  onReorderDeckAt: (deckIndex: number, layout: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
}

function BattleHubDragChip({ card }: { card: Card }) {
  const rarityMeta = getRarityMeta(card.rarity);
  return (
    <div
      className={`deck-drag-chip deck-drag-chip--${card.rarity}`}
      style={
        {
          '--rarity-border': rarityMeta.rowBorder,
          '--rarity-bg': rarityMeta.rowBg,
          '--rarity-border-width': rarityMeta.rowBorderWidth,
          '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
        } as CSSProperties
      }
    >
      <RarityBadge rarity={card.rarity} size="deck" className="deck-drag-chip-rarity" />
      <div className="deck-drag-chip-art">
        <CardPreview pixels={card.pixels} />
      </div>
      <span className="deck-drag-chip-bp">{card.bp}</span>
    </div>
  );
}

export function BattleHubScreen({
  decks,
  deckNames,
  unlockedDeckCount,
  lastBattleDeckIndex,
  onStartBattle,
  onGoToMyDeck,
  onReorderDeckAt,
  onMoveCardBetweenDecks,
}: BattleHubScreenProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const dragSessionRef = useRef<BattleHubDragState | null>(null);

  const readyIndices = useMemo(
    () => getBattleReadyDeckIndices(decks, unlockedDeckCount),
    [decks, unlockedDeckCount],
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex),
  );
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [dragState, setDragState] = useState<BattleHubDragState | null>(null);

  useEffect(() => {
    setSelectedIndex(resolveBattleHubDeckSelection(readyIndices, lastBattleDeckIndex));
  }, [readyIndices, lastBattleDeckIndex]);

  const canStart =
    selectedIndex != null && readyIndices.length > 0 && dragState == null;

  const handleCpuBattle = () => {
    if (selectedIndex != null && dragState == null) {
      onStartBattle(selectedIndex);
    }
  };

  const deckRows = useMemo(() => {
    return Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
      const unlocked = isDeckSlotUnlocked(index, unlockedDeckCount);
      const layout = normalizeDeckLayout(decks[index] ?? []);
      const cardCount = countDeckCards(layout);
      const hasLost = deckHasLostCard(layout);
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
        hasLost,
        power: computeDeckPower(getDeckCards(layout)),
      };
    });
  }, [decks, unlockedDeckCount]);

  const hasAnyLostDeck = useMemo(
    () => deckRows.some(({ status, hasLost }) => status !== 'locked' && hasLost),
    [deckRows],
  );

  const showInteractionHint = useMemo(
    () => deckRows.some(({ status, cardCount }) => status !== 'locked' && cardCount > 0),
    [deckRows],
  );

  const handleDeckSelect = useCallback(
    (index: number, status: BattleHubDeckStatus) => {
      if (dragState != null || status !== 'ready') return;
      setSelectedIndex(index);
    },
    [dragState],
  );

  const finishDrag = useCallback(
    (state: BattleHubDragState) => {
      dragSessionRef.current = null;
      setDragState(null);
      if (
        state.targetDeckIndex === state.sourceDeckIndex &&
        state.targetSlotIndex === state.fromSlotIndex
      ) {
        return;
      }
      if (state.sourceDeckIndex === state.targetDeckIndex) {
        const layout = normalizeDeckLayout(decks[state.sourceDeckIndex] ?? []);
        onReorderDeckAt(
          state.sourceDeckIndex,
          moveCardInLayout(layout, state.fromSlotIndex, state.targetSlotIndex),
        );
        return;
      }
      onMoveCardBetweenDecks(
        state.sourceDeckIndex,
        state.fromSlotIndex,
        state.targetDeckIndex,
        state.targetSlotIndex,
      );
    },
    [decks, onMoveCardBetweenDecks, onReorderDeckAt],
  );

  const startDrag = useCallback(
    (
      deckIndex: number,
      slotIndex: number,
      card: Card,
      clientX: number,
      clientY: number,
    ) => {
      const session: BattleHubDragState = {
        cardId: card.id,
        sourceDeckIndex: deckIndex,
        fromSlotIndex: slotIndex,
        targetDeckIndex: deckIndex,
        targetSlotIndex: slotIndex,
        ghostLeft: clientX - BATTLE_HUB_DRAG_CHIP_SIZE / 2,
        ghostTop: clientY - BATTLE_HUB_DRAG_CHIP_SIZE / 2,
        pointerOffsetX: BATTLE_HUB_DRAG_CHIP_SIZE / 2,
        pointerOffsetY: BATTLE_HUB_DRAG_CHIP_SIZE / 2,
      };
      dragSessionRef.current = session;
      setDragState(session);
    },
    [],
  );

  const handleCardPointerDown = useCallback(
    (
      deckIndex: number,
      slotIndex: number,
      card: Card,
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (event.button !== 0 || dragSessionRef.current) return;
      if (!isDeckSlotUnlocked(deckIndex, unlockedDeckCount)) return;

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      let dragStarted = false;

      const clearTimer = () => {
        if (longPressTimer != null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      let longPressTimer: ReturnType<typeof setTimeout> | null = window.setTimeout(
        () => {
          longPressTimer = null;
          if (moved) return;
          dragStarted = true;
          startDrag(deckIndex, slotIndex, card, startX, startY);
        },
        BATTLE_HUB_LONG_PRESS_MS,
      );

      const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
        );
        if (!dragStarted && distance > BATTLE_HUB_MOVE_THRESHOLD) {
          moved = true;
          clearTimer();
        }
        if (!dragStarted) return;

        const listEl = listRef.current;
        const prev = dragSessionRef.current;
        if (!prev || !listEl) return;

        const target =
          findBattleHubDropTarget(
            moveEvent.clientX,
            moveEvent.clientY,
            listEl,
            unlockedDeckCount,
          ) ?? {
            deckIndex: prev.targetDeckIndex,
            slotIndex: prev.targetSlotIndex,
          };

        const next: BattleHubDragState = {
          ...prev,
          ghostLeft: moveEvent.clientX - prev.pointerOffsetX,
          ghostTop: moveEvent.clientY - prev.pointerOffsetY,
          targetDeckIndex: target.deckIndex,
          targetSlotIndex: target.slotIndex,
        };
        dragSessionRef.current = next;
        setDragState(next);
      };

      const onPointerEnd = () => {
        clearTimer();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);

        if (dragStarted) {
          const state = dragSessionRef.current;
          if (state) finishDrag(state);
          return;
        }
        if (!moved) {
          setDetailTarget({ card, deckIndex });
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
    },
    [finishDrag, startDrag, unlockedDeckCount],
  );

  const draggedCard =
    dragState != null
      ? decks[dragState.sourceDeckIndex]?.[dragState.fromSlotIndex] ?? null
      : null;

  return (
    <section
      className={`screen screen-battle-hub${dragState ? ' screen-battle-hub-dragging' : ''}`}
    >
      <div className="battle-hub-body">
        <ul
          ref={listRef}
          className="battle-hub-deck-list"
          aria-label="バトル用デッキ"
        >
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
                <div
                  className={[
                    'battle-hub-deck-tile',
                    isSelected ? 'is-selected' : '',
                    status === 'locked' ? 'is-locked' : '',
                    status === 'incomplete' ? 'is-incomplete' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={tileLabel}
                >
                  <button
                    type="button"
                    className="battle-hub-deck-tile-select-area"
                    disabled={!isSelectable || dragState != null}
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
                  </button>
                  <div className="battle-hub-deck-icons">
                    {layout.map((card, slotIndex) => {
                      if (status === 'locked') {
                        return (
                          <div
                            key={`locked-${slotIndex}`}
                            className="battle-hub-deck-icon battle-hub-deck-icon--locked"
                            data-battle-hub-deck-index={index}
                            data-battle-hub-slot-index={slotIndex}
                          />
                        );
                      }
                      if (!card) {
                        const isDropTarget =
                          dragState != null &&
                          dragState.targetDeckIndex === index &&
                          dragState.targetSlotIndex === slotIndex;
                        return (
                          <button
                            key={`empty-${slotIndex}`}
                            type="button"
                            className={[
                              'battle-hub-deck-icon',
                              'battle-hub-deck-icon--empty',
                              'battle-hub-deck-tile-select-area',
                              isDropTarget ? 'is-drop-target' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            data-battle-hub-deck-index={index}
                            data-battle-hub-slot-index={slotIndex}
                            disabled={!isSelectable || dragState != null}
                            aria-label={`${deckLabel} 空きスロット`}
                            onClick={() => handleDeckSelect(index, status)}
                          />
                        );
                      }

                      const rarityMeta = getRarityMeta(card.rarity);
                      const cardIsLost = isCardLost(card);
                      const isDragSource =
                        dragState != null &&
                        dragState.sourceDeckIndex === index &&
                        dragState.fromSlotIndex === slotIndex;
                      const isDropTarget =
                        dragState != null &&
                        dragState.targetDeckIndex === index &&
                        dragState.targetSlotIndex === slotIndex &&
                        !isDragSource;

                      return (
                        <div
                          key={card.id}
                          className={[
                            'battle-hub-deck-icon',
                            'battle-hub-deck-icon--interactive',
                            `battle-hub-deck-icon--${card.rarity}`,
                            cardIsLost ? 'battle-hub-deck-icon--lost' : '',
                            isDragSource ? 'is-drag-source' : '',
                            isDropTarget ? 'is-drop-target' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          data-battle-hub-deck-index={index}
                          data-battle-hub-slot-index={slotIndex}
                          style={{
                            borderColor: cardIsLost ? '#e53935' : rarityMeta.rowBorder,
                            borderWidth: rarityMeta.rowBorderWidth,
                            background: rarityMeta.rowBg,
                            boxShadow: cardIsLost
                              ? 'none'
                              : (rarityMeta.rowBoxShadow ?? 'none'),
                          }}
                          role="button"
                          tabIndex={dragState != null ? -1 : 0}
                          aria-label={
                            cardIsLost
                              ? `${card.name}（ロスト中）`
                              : card.name
                          }
                          onPointerDown={(event) =>
                            handleCardPointerDown(index, slotIndex, card, event)
                          }
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
                            />
                          </div>
                          {cardIsLost && (
                            <span className="card-lost-badge card-lost-badge--hub" aria-hidden>
                              ロスト中
                            </span>
                          )}
                        </div>
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

        <div className="battle-hub-actions">
          <button
            type="button"
            className="battle-hub-mode-btn"
            disabled={!canStart}
            onClick={handleCpuBattle}
          >
            CPU戦
          </button>
          {showInteractionHint && (
            <p className="battle-hub-notice" role="status">
              カードをタップで詳細、長押しで移動。編集・削除はマイデッキで行えます。
            </p>
          )}
          {readyIndices.length === 0 && (
            <p className="battle-hub-notice" role="status">
              5枚揃ったデッキがありません。マイデッキで編成してください。
            </p>
          )}
          {hasAnyLostDeck && (
            <p className="battle-hub-notice battle-hub-notice--lost" role="status">
              ロスト中のカードがあります。タップで詳細を確認し、マイデッキで削除するか、長押しで別デッキへ移動できます。
            </p>
          )}
          {readyIndices.length > 1 && selectedIndex == null && (
            <p className="battle-hub-notice" role="status">
              使用するデッキを選んでください（デッキ名または空スロットをタップ）。
            </p>
          )}
        </div>
      </div>

      {dragState && draggedCard && (
        <div
          className={`deck-drag-chip-float battle-hub-drag-chip-float${
            dragState.targetDeckIndex !== dragState.sourceDeckIndex
              ? ' deck-drag-chip-float--cross-deck'
              : ''
          }${
            dragState.targetSlotIndex !== dragState.fromSlotIndex
              ? ' deck-drag-chip-float--slot-ready'
              : ''
          }`}
          style={{
            left: dragState.ghostLeft,
            top: dragState.ghostTop,
            width: BATTLE_HUB_DRAG_CHIP_SIZE,
            height: BATTLE_HUB_DRAG_CHIP_SIZE,
          }}
          aria-hidden
        >
          <BattleHubDragChip card={draggedCard} />
        </div>
      )}

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
