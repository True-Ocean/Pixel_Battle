import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  applyAttributeChange,
  canAffordAttributeEventGacha,
  canAffordAttributeGachaConfirm,
  canAffordAttributeGachaPixels,
  getAttributeEventGachaJewelCost,
  getAttributeGachaJewelCost,
  getAttributeGachaPixelCost,
  getEventGachaFeaturedAttribute,
  isEventAttributeGachaAvailable,
  type AttributeEventGachaState,
  type AttributeGachaMode,
  type AttributeGachaPulls,
} from '../card';
import {
  EVENT_ATTRIBUTE_GACHA_FEATURED_RATE,
  EVENT_ATTRIBUTE_GACHA_PITY,
} from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import type { Attribute, Card } from '../types';
import type {
  AttributeGachaConfirmOutcome,
  AttributeGachaResolveOutcome,
  AttributeGachaStartOutcome,
  AttributeGachaStartSuccess,
} from './attributeGachaTypes';
import { AttributeBadge } from './AttributeBadge';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';
import { JewelAmount } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

type GachaPhase = 'modePick' | 'revealing' | 'pick' | 'confirmPick' | 'done';

const SPIN_INTERVAL_MS = 90;
const SPIN_TICKS = 18;
/** 1つ確定してから次のルーレットまでの間 */
const REVEAL_PAUSE_MS = 450;
/** 最後の抽選確定後、結果選択へ進むまでの間（確定演出を見せる） */
const FINAL_REVEAL_PAUSE_MS = 900;

interface ModeOption {
  mode: AttributeGachaMode;
  subtitle: string;
  /** タイトル直下のキャッチ（任意） */
  tagline?: string;
  label: string;
  pulls: AttributeGachaPulls | null;
  toneClass: string;
  costKind: 'px' | 'jewel' | 'eventJewel';
}

const BASE_MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'single',
    subtitle: 'ノーマルガチャ',
    tagline: '解放済みの全属性から\nランダムに出ます',
    label: '1回引く！',
    pulls: 1,
    toneClass: 'attribute-gacha-panel--single',
    costKind: 'px',
  },
  {
    mode: 'multi5',
    subtitle: '5連ガチャ',
    tagline: '解放済みの全属性から\nランダムに出ます',
    label: '5回引く！',
    pulls: 5,
    toneClass: 'attribute-gacha-panel--multi5',
    costKind: 'px',
  },
  {
    mode: 'multi10',
    subtitle: '10連ガチャ',
    tagline: '解放済みの全属性から\nランダムに出ます',
    label: '10回引く！',
    pulls: 10,
    toneClass: 'attribute-gacha-panel--multi10',
    costKind: 'px',
  },
  {
    mode: 'confirm',
    subtitle: '確定ガチャ',
    tagline: '好きな属性を選べる！',
    label: '確定で引く！',
    pulls: null,
    toneClass: 'attribute-gacha-panel--confirm',
    costKind: 'jewel',
  },
];

const ATTRIBUTE_GACHA_HELP = {
  title: '属性ガチャ',
  sections: [
    {
      items: [
        '解放済み属性から抽選します。同じ属性でも消費されます。',
        '結果から1つ採用するか現状維持を選べます。',
        '選ばなかった属性はかけらになります（カードのこれまでの属性も含みます）。',
      ],
    },
  ],
} as const;

interface DoneState {
  kind: 'pixel' | 'confirm' | 'kept' | 'event';
  attribute: Attribute | null;
  previousAttribute: Attribute;
  previousBp: number;
  newBp: number;
  previousFreePixels?: number;
  nextFreePixels?: number;
  previousJewels?: number;
  nextJewels?: number;
  shardsGranted?: Partial<Record<Attribute, number>>;
}

interface AttributeGachaModalProps {
  open: boolean;
  card: Card;
  userLevel: number;
  freePixels: number;
  jewels: number;
  attributeEventGacha: AttributeEventGachaState;
  paletteShopUnlocks?: readonly number[];
  onClose: () => void;
  onStartPixelGacha: (pulls: AttributeGachaPulls) => AttributeGachaStartOutcome;
  onStartEventGacha: () => AttributeGachaStartOutcome;
  onResolvePixelGacha: (keepIndex: number | null) => AttributeGachaResolveOutcome;
  onConfirmAttribute: (attribute: Attribute) => AttributeGachaConfirmOutcome;
}

export function AttributeGachaModal({
  open,
  card,
  userLevel,
  freePixels,
  jewels,
  attributeEventGacha,
  paletteShopUnlocks = [],
  onClose,
  onStartPixelGacha,
  onStartEventGacha,
  onResolvePixelGacha,
  onConfirmAttribute,
}: AttributeGachaModalProps) {
  const [phase, setPhase] = useState<GachaPhase>('modePick');
  const [activeMode, setActiveMode] = useState<AttributeGachaMode>('single');
  const [error, setError] = useState<ReactNode>(null);
  const [displayAttribute, setDisplayAttribute] = useState<Attribute>(card.attribute);
  const [spinning, setSpinning] = useState(false);
  const [startResult, setStartResult] = useState<AttributeGachaStartSuccess | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedRollIndex, setSelectedRollIndex] = useState<number | null>(null);
  const [keepCurrent, setKeepCurrent] = useState(false);
  const [confirmSelected, setConfirmSelected] = useState<Attribute>(card.attribute);
  const [done, setDone] = useState<DoneState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modeIndex, setModeIndex] = useState(0);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const unlockedRef = useRef<Attribute[]>([]);

  const eventAvailable = isEventAttributeGachaAvailable(userLevel);
  const featuredAttribute = getEventGachaFeaturedAttribute(userLevel);
  const pityRemaining = Math.max(
    1,
    EVENT_ATTRIBUTE_GACHA_PITY - attributeEventGacha.pityMissCount,
  );
  const eventRatePercent = Math.round(EVENT_ATTRIBUTE_GACHA_FEATURED_RATE * 100);

  const modeOptions = useMemo((): ModeOption[] => {
    if (!eventAvailable || !featuredAttribute) return BASE_MODE_OPTIONS;
    const eventOption: ModeOption = {
      mode: 'event',
      subtitle: '期間限定ガチャ',
      label: '1回引く！',
      pulls: 1,
      toneClass: 'attribute-gacha-panel--event',
      costKind: 'eventJewel',
    };
    const confirmIndex = BASE_MODE_OPTIONS.findIndex((option) => option.mode === 'confirm');
    if (confirmIndex < 0) return [...BASE_MODE_OPTIONS, eventOption];
    return [
      ...BASE_MODE_OPTIONS.slice(0, confirmIndex),
      eventOption,
      ...BASE_MODE_OPTIONS.slice(confirmIndex),
    ];
  }, [eventAvailable, featuredAttribute]);

  const resetKey = `${open}\u0000${card.id}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (open) {
      setPhase('modePick');
      setActiveMode('single');
      setError(null);
      setDisplayAttribute(card.attribute);
      setSpinning(false);
      setStartResult(null);
      setRevealedCount(0);
      setSelectedRollIndex(null);
      setKeepCurrent(false);
      setConfirmSelected(card.attribute);
      setDone(null);
      setHelpOpen(false);
      setModeIndex(0);
      swipeRef.current = null;
    }
  }

  unlockedRef.current = getUnlockedAttributes(userLevel);

  useEffect(() => {
    if (open) return;
    if (spinTimerRef.current != null) {
      window.clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
      }
      if (pauseTimerRef.current != null) {
        window.clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (modeIndex >= modeOptions.length) {
      setModeIndex(0);
    }
  }, [modeIndex, modeOptions.length]);

  if (!open) return null;

  const unlocked = unlockedRef.current;
  const jewelCost = getAttributeGachaJewelCost();
  const eventJewelCost = getAttributeEventGachaJewelCost();
  const canAffordConfirm = canAffordAttributeGachaConfirm({ jewels });
  const canAffordEvent = canAffordAttributeEventGacha({ jewels });
  const confirmPreviewBp = applyAttributeChange(
    card,
    confirmSelected,
    userLevel,
    paletteShopUnlocks,
  ).bp;

  const clearTimers = () => {
    if (spinTimerRef.current != null) {
      window.clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  const goToPick = () => {
    setSpinning(false);
    setSelectedRollIndex(null);
    setKeepCurrent(false);
    setPhase('pick');
  };

  const spinOne = (rollIndex: number, rolls: readonly Attribute[]) => {
    const target = rolls[rollIndex];
    if (!target) {
      goToPick();
      return;
    }
    setPhase('revealing');
    setSpinning(true);
    setDisplayAttribute(unlocked[0] ?? target);
    let tick = 0;
    spinTimerRef.current = window.setInterval(() => {
      tick += 1;
      const pool = unlockedRef.current;
      const index = tick % Math.max(pool.length, 1);
      setDisplayAttribute(pool[index] ?? target);
      if (tick >= SPIN_TICKS) {
        if (spinTimerRef.current != null) {
          window.clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        setDisplayAttribute(target);
        setSpinning(false);
        const nextRevealed = rollIndex + 1;
        setRevealedCount(nextRevealed);
        if (nextRevealed >= rolls.length) {
          pauseTimerRef.current = window.setTimeout(() => {
            pauseTimerRef.current = null;
            goToPick();
          }, FINAL_REVEAL_PAUSE_MS);
          return;
        }
        pauseTimerRef.current = window.setTimeout(() => {
          pauseTimerRef.current = null;
          spinOne(nextRevealed, rolls);
        }, REVEAL_PAUSE_MS);
      }
    }, SPIN_INTERVAL_MS);
  };

  const beginReveal = (outcome: AttributeGachaStartSuccess, mode: AttributeGachaMode) => {
    setActiveMode(mode);
    setStartResult(outcome);
    setRevealedCount(0);
    setSelectedRollIndex(null);
    setKeepCurrent(false);
    setDone(null);
    spinOne(0, outcome.rolls);
  };

  const runPixelGacha = (pulls: AttributeGachaPulls, mode: AttributeGachaMode) => {
    if (!canAffordAttributeGachaPixels({ freePixels }, pulls)) return false;
    setError(null);
    const outcome = onStartPixelGacha(pulls);
    if ('error' in outcome) {
      setError(outcome.error);
      return false;
    }
    beginReveal(outcome, mode);
    return true;
  };

  const runEventGacha = () => {
    if (!canAffordEvent) return false;
    setError(null);
    const outcome = onStartEventGacha();
    if ('error' in outcome) {
      setError(outcome.error);
      return false;
    }
    beginReveal(outcome, 'event');
    return true;
  };

  const handleModeClick = (mode: AttributeGachaMode) => {
    if (mode === 'confirm') {
      setActiveMode('confirm');
      setConfirmSelected(card.attribute);
      setError(null);
      setPhase('confirmPick');
      return;
    }
    if (mode === 'event') {
      runEventGacha();
      return;
    }
    const pulls = mode === 'single' ? 1 : mode === 'multi5' ? 5 : 10;
    runPixelGacha(pulls, mode);
  };

  const applyResolve = (keepIndex: number | null) => {
    const resolved = onResolvePixelGacha(keepIndex);
    if ('error' in resolved) {
      setError(resolved.error);
      return;
    }
    if (keepIndex == null) {
      setDone({
        kind: 'kept',
        attribute: null,
        previousAttribute: resolved.previousAttribute,
        previousBp: resolved.previousBp,
        newBp: resolved.newBp,
        previousFreePixels: resolved.previousFreePixels,
        nextFreePixels: resolved.nextFreePixels,
        previousJewels: resolved.previousJewels,
        nextJewels: resolved.nextJewels,
        shardsGranted: resolved.shardsGranted,
      });
    } else {
      setDone({
        kind: activeMode === 'event' ? 'event' : 'pixel',
        attribute: resolved.attribute,
        previousAttribute: resolved.previousAttribute,
        previousBp: resolved.previousBp,
        newBp: resolved.newBp,
        previousFreePixels: resolved.previousFreePixels,
        nextFreePixels: resolved.nextFreePixels,
        previousJewels: resolved.previousJewels,
        nextJewels: resolved.nextJewels,
        shardsGranted: resolved.shardsGranted,
      });
    }
    setPhase('done');
  };

  const handleResolvePick = () => {
    if (keepCurrent) {
      applyResolve(null);
      return;
    }
    if (selectedRollIndex == null) return;
    applyResolve(selectedRollIndex);
  };

  const handleConfirmAttribute = () => {
    if (!canAffordConfirm) return;
    setError(null);
    const outcome = onConfirmAttribute(confirmSelected);
    if (typeof outcome === 'string') {
      setError(outcome);
      return;
    }
    setDone({
      kind: 'confirm',
      attribute: outcome.attribute,
      previousAttribute: card.attribute,
      previousBp: outcome.previousBp,
      newBp: outcome.newBp,
      previousJewels: outcome.previousJewels,
      nextJewels: outcome.nextJewels,
    });
    setPhase('done');
  };

  const handleAgain = () => {
    clearTimers();
    setError(null);
    setDone(null);
    setStartResult(null);
    setRevealedCount(0);
    if (activeMode === 'confirm') {
      setConfirmSelected(card.attribute);
      setPhase('confirmPick');
      return;
    }
    if (activeMode === 'event') {
      runEventGacha();
      return;
    }
    const pulls = activeMode === 'single' ? 1 : activeMode === 'multi5' ? 5 : 10;
    runPixelGacha(pulls, activeMode);
  };

  const canClose =
    phase === 'modePick' || phase === 'confirmPick' || phase === 'done';

  const handleClose = () => {
    if (!canClose) return;
    onClose();
  };

  const canResolvePick = keepCurrent || selectedRollIndex != null;
  const totalPulls = startResult?.rolls.length ?? 0;
  const currentAttribute =
    startResult?.previousAttribute ?? card.attribute;

  const phaseTitle =
    phase === 'modePick'
      ? '属性ガチャ'
      : phase === 'revealing'
        ? totalPulls > 1
          ? `抽選中 ${Math.min(revealedCount + 1, totalPulls)} / ${totalPulls}`
          : activeMode === 'event'
            ? '期間限定ガチャ抽選中！'
            : '属性ガチャ抽選中！'
        : phase === 'pick'
          ? '結果を選ぶ'
          : phase === 'confirmPick'
            ? '確定'
            : done?.kind === 'kept'
              ? '現状維持'
              : '属性変更！';

  const againAffordable =
    activeMode === 'confirm'
      ? canAffordConfirm
      : activeMode === 'event'
        ? canAffordEvent
        : canAffordAttributeGachaPixels(
            { freePixels },
            activeMode === 'single' ? 1 : activeMode === 'multi5' ? 5 : 10,
          );

  const againCostNode =
    activeMode === 'confirm' ? (
      <JewelAmount
        amount={jewelCost}
        className="attribute-edit-confirm-cost"
        iconClassName="attribute-edit-confirm-icon"
      />
    ) : activeMode === 'event' ? (
      <JewelAmount
        amount={eventJewelCost}
        className="attribute-edit-confirm-cost"
        iconClassName="attribute-edit-confirm-icon"
      />
    ) : (
      <span className="attribute-edit-confirm-cost">
        <PixelCoinIcon className="attribute-edit-confirm-icon" />
        <span>
          {getAttributeGachaPixelCost(
            activeMode === 'single' ? 1 : activeMode === 'multi5' ? 5 : 10,
          ).toLocaleString()}
        </span>
      </span>
    );

  const shardEntries =
    done?.shardsGranted != null
      ? (
          Object.entries(done.shardsGranted) as Array<[Attribute, number]>
        ).filter(([, count]) => count > 0)
      : [];

  const selectedModeOption = modeOptions[modeIndex] ?? modeOptions[0]!;
  const selectedModeAffordable =
    selectedModeOption.costKind === 'jewel'
      ? canAffordConfirm
      : selectedModeOption.costKind === 'eventJewel'
        ? canAffordEvent
        : canAffordAttributeGachaPixels(
            { freePixels },
            selectedModeOption.pulls ?? 1,
          );

  const SWIPE_THRESHOLD_PX = 48;
  const modeCount = modeOptions.length;

  const shiftModeIndex = (delta: number) => {
    setModeIndex((index) => (index + delta + modeCount) % modeCount);
  };

  const handleModePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleModePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipeRef.current = null;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      shiftModeIndex(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) <= 12 && Math.abs(dy) <= 12 && selectedModeAffordable) {
      handleModeClick(selectedModeOption.mode);
    }
  };

  const handleModePointerCancel = () => {
    swipeRef.current = null;
  };

  const renderModeCost = (option: ModeOption) => {
    if (option.costKind === 'jewel') {
      return (
        <JewelAmount
          amount={jewelCost}
          className="attribute-gacha-mode-cost"
          iconClassName="attribute-edit-confirm-icon"
        />
      );
    }
    if (option.costKind === 'eventJewel') {
      return (
        <JewelAmount
          amount={eventJewelCost}
          className="attribute-gacha-mode-cost"
          iconClassName="attribute-edit-confirm-icon"
        />
      );
    }
    return (
      <span className="attribute-gacha-mode-cost">
        <PixelCoinIcon className="attribute-edit-confirm-icon" />
        <span>
          {getAttributeGachaPixelCost(option.pulls ?? 1).toLocaleString()}
        </span>
      </span>
    );
  };

  return createPortal(
    <div
      className="attribute-edit-backdrop"
      onClick={canClose ? handleClose : undefined}
    >
      <div
        className={[
          'attribute-edit-panel',
          phase === 'revealing' || phase === 'done'
            ? 'attribute-edit-panel--retouch-result'
            : '',
          phase === 'confirmPick' ? 'attribute-select-panel' : '',
          phase === 'modePick' || phase === 'pick' || phase === 'revealing'
            ? 'attribute-gacha-panel'
            : '',
          phase === 'modePick' ? 'attribute-gacha-panel--mode-pick' : '',
          phase === 'modePick' ? selectedModeOption.toneClass : '',
          phase === 'modePick' && !selectedModeAffordable
            ? 'attribute-gacha-panel--pending'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-gacha-title"
        aria-live={phase === 'revealing' ? 'polite' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="attribute-gacha-title" className="attribute-edit-title">
          {phase === 'modePick' ? (
            <span className="attribute-gacha-title-row">
              <span className="attribute-gacha-title-text">
                {selectedModeOption.subtitle}
              </span>
              <HelpInfoButton
                className="attribute-gacha-help-btn"
                ariaLabel="属性ガチャについて"
                onClick={() => setHelpOpen(true)}
              />
            </span>
          ) : (
            phaseTitle
          )}
        </h2>

        {phase === 'modePick' && (
          <>
            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}
            <div
              className="attribute-gacha-mode-carousel"
              role="group"
              aria-roledescription="carousel"
              aria-label="ガチャモード"
            >
              <div className="attribute-gacha-mode-slide-row">
                <button
                  type="button"
                  className="attribute-gacha-mode-arrow"
                  aria-label="前のモード"
                  onClick={() => shiftModeIndex(-1)}
                >
                  ◀︎
                </button>
                <button
                  type="button"
                  className="attribute-gacha-mode-action"
                  disabled={!selectedModeAffordable}
                  aria-label={`${selectedModeOption.subtitle} ${selectedModeOption.tagline ? `${selectedModeOption.tagline} ` : ''}${selectedModeOption.label}（${modeIndex + 1} / ${modeOptions.length}）`}
                  onPointerDown={handleModePointerDown}
                  onPointerUp={handleModePointerUp}
                  onPointerCancel={handleModePointerCancel}
                >
                  <span className="attribute-gacha-mode-desc-slot">
                    {selectedModeOption.tagline && (
                      <span className="attribute-gacha-mode-tagline">
                        {selectedModeOption.tagline}
                      </span>
                    )}
                    {selectedModeOption.mode === 'event' &&
                      featuredAttribute != null && (
                        <span className="attribute-gacha-mode-hint">
                          <span className="attribute-gacha-mode-hint-line">
                            <AttributeBadge
                              attribute={featuredAttribute}
                              size="card"
                              className="attribute-gacha-mode-hint-badge"
                            />
                            <span>が{eventRatePercent}%で出る！</span>
                          </span>
                          <span className="attribute-gacha-mode-hint-sub">
                            {`（天井${EVENT_ATTRIBUTE_GACHA_PITY}回保証・あと${pityRemaining}回）`}
                          </span>
                        </span>
                      )}
                  </span>
                  <span className="attribute-gacha-mode-label">
                    {selectedModeOption.label}
                  </span>
                  {renderModeCost(selectedModeOption)}
                </button>
                <button
                  type="button"
                  className="attribute-gacha-mode-arrow"
                  aria-label="次のモード"
                  onClick={() => shiftModeIndex(1)}
                >
                  ▶︎
                </button>
              </div>
              <div
                className="attribute-gacha-mode-dots"
                role="tablist"
                aria-label="ガチャモードの位置"
              >
                {modeOptions.map((dotOption, index) => (
                  <button
                    key={dotOption.mode}
                    type="button"
                    role="tab"
                    aria-selected={index === modeIndex}
                    aria-label={dotOption.subtitle}
                    className={`attribute-gacha-mode-dot${
                      index === modeIndex
                        ? ' attribute-gacha-mode-dot--active'
                        : ''
                    }`}
                    onClick={() => setModeIndex(index)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {phase === 'revealing' && startResult && (
          <div className="attribute-retouch-result">
            <div
              className={[
                'attribute-retouch-badge-wrap',
                'attribute-create-roulette-badge-wrap',
                spinning ? 'attribute-retouch-badge-wrap--spinning' : '',
                !spinning ? 'attribute-create-roulette-badge-wrap--confirmed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={spinning ? '属性抽選中' : getAttributeMeta(displayAttribute).ariaName}
            >
              <AttributeBadge attribute={displayAttribute} size="deck" />
              {!spinning && (
                <span className="attribute-create-roulette-glow" aria-hidden />
              )}
            </div>
            {totalPulls > 1 && (
              <div
                className="attribute-gacha-roll-grid attribute-gacha-roll-grid--revealed"
                aria-label="これまでに出た属性"
              >
                {startResult.rolls.map((attribute, index) => {
                  const revealed = index < revealedCount;
                  return (
                    <div
                      key={`reveal-slot-${index}`}
                      className={`attribute-gacha-roll-slot${
                        revealed ? '' : ' attribute-gacha-roll-slot--empty'
                      }`}
                      aria-label={
                        revealed
                          ? `${index + 1}つ目 ${getAttributeMeta(attribute).ariaName}`
                          : `${index + 1}つ目 未抽選`
                      }
                      aria-hidden={!revealed}
                    >
                      {revealed ? (
                        <AttributeBadge attribute={attribute} size="deck" />
                      ) : (
                        <span className="attribute-gacha-roll-slot-placeholder" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {phase === 'pick' && startResult && (
          <>
            <p className="attribute-edit-message muted">
              現状維持を選択した場合、ガチャで獲得した属性はかけらになります。
            </p>
            <div
              className={`attribute-gacha-roll-grid${
                startResult.rolls.length === 1 ? ' attribute-gacha-roll-grid--single' : ''
              }`}
              role="listbox"
              aria-label="ガチャ結果"
            >
              {startResult.rolls.map((attribute, index) => {
                const meta = getAttributeMeta(attribute);
                const selected = !keepCurrent && selectedRollIndex === index;
                return (
                  <button
                    key={`${attribute}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={meta.ariaName}
                    className={`attribute-gacha-roll-slot${
                      selected ? ' attribute-gacha-roll-slot--selected' : ''
                    }`}
                    onClick={() => {
                      setKeepCurrent(false);
                      setSelectedRollIndex(index);
                    }}
                  >
                    <AttributeBadge attribute={attribute} size="deck" />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={`attribute-gacha-keep-btn${
                keepCurrent ? ' attribute-gacha-keep-btn--selected' : ''
              }`}
              aria-pressed={keepCurrent}
              onClick={() => {
                setKeepCurrent(true);
                setSelectedRollIndex(null);
              }}
            >
              <span className="attribute-gacha-keep-label">現状維持</span>
              <AttributeBadge attribute={currentAttribute} size="deck" />
            </button>
            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}
            <div className="attribute-edit-actions attribute-edit-actions--equal">
              <button
                type="button"
                className={`attribute-edit-confirm${
                  canResolvePick ? '' : ' attribute-edit-confirm--pending'
                }`}
                disabled={!canResolvePick}
                onClick={handleResolvePick}
              >
                決定
              </button>
            </div>
          </>
        )}

        {phase === 'confirmPick' && (
          <>
            <p className="attribute-edit-message muted">
              変更したい属性を選んでください。
            </p>
            <div
              className="attribute-select-grid"
              role="listbox"
              aria-label="属性一覧"
            >
              {unlocked.map((attribute) => {
                const meta = getAttributeMeta(attribute);
                const isSelected = confirmSelected === attribute;
                return (
                  <button
                    key={attribute}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={meta.ariaName}
                    className={`attribute-select-option${
                      isSelected ? ' attribute-select-option--selected' : ''
                    }`}
                    onClick={() => setConfirmSelected(attribute)}
                  >
                    <AttributeBadge attribute={attribute} size="deck" />
                  </button>
                );
              })}
            </div>
            <p className="attribute-select-bp muted" aria-live="polite">
              {confirmSelected === card.attribute
                ? `BP ${card.bp}（同じ属性でも消費されます）`
                : confirmPreviewBp === card.bp
                  ? `BP ${card.bp}（変更なし）`
                  : `BP ${card.bp} → ${confirmPreviewBp}`}
            </p>
            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}
            <div className="attribute-edit-actions attribute-edit-actions--equal">
              <button
                type="button"
                className="attribute-edit-cancel"
                onClick={() => {
                  setPhase('modePick');
                  setError(null);
                }}
              >
                戻る
              </button>
              <button
                type="button"
                className={`attribute-edit-confirm${
                  canAffordConfirm ? '' : ' attribute-edit-confirm--pending'
                }`}
                disabled={!canAffordConfirm}
                onClick={handleConfirmAttribute}
              >
                <span>確定</span>
                <JewelAmount
                  amount={jewelCost}
                  className="attribute-edit-confirm-cost"
                  iconClassName="attribute-edit-confirm-icon"
                />
              </button>
            </div>
          </>
        )}

        {phase === 'done' && done && (
          <div className="attribute-retouch-result">
            {done.kind === 'kept' ? (
              <p className="attribute-gacha-kept-line">
                <span>現在の属性</span>
                <AttributeBadge
                  attribute={done.previousAttribute}
                  size="deck"
                />
                <span>を維持</span>
              </p>
            ) : done.attribute != null ? (
              <>
                <p className="attribute-gacha-kept-line">
                  <AttributeBadge
                    attribute={done.previousAttribute}
                    size="deck"
                  />
                  <span>から</span>
                  <AttributeBadge attribute={done.attribute} size="deck" />
                  <span>に変更しました。</span>
                </p>
                <p className="attribute-gacha-bp-note muted">
                  （BP：{done.previousBp}→{done.newBp}）
                </p>
              </>
            ) : null}
            {shardEntries.length > 0 && (
              <ul className="attribute-gacha-kept-shards" aria-label="獲得かけら">
                {shardEntries.map(([attribute, count]) => (
                  <li key={attribute} className="attribute-gacha-kept-shard">
                    <AttributeBadge attribute={attribute} size="deck" />
                    <span>のかけら×{count} 回収</span>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}
            <div className="attribute-retouch-done-actions">
              <button
                type="button"
                className={`attribute-edit-confirm attribute-retouch-again-btn${
                  againAffordable ? '' : ' attribute-edit-confirm--pending'
                }`}
                disabled={!againAffordable}
                onClick={handleAgain}
              >
                <span>もう一度</span>
                {againCostNode}
              </button>
              <button
                type="button"
                className="attribute-edit-close-btn attribute-retouch-close-btn"
                onClick={handleClose}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
      {helpOpen && (
        <HelpPanelModal
          topic={ATTRIBUTE_GACHA_HELP}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}
