import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAttributeMeta } from '../config/attributes';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import type { Attribute } from '../types';
import { AttributeBadge } from './AttributeBadge';

type CreateRoulettePhase = 'spinning' | 'confirmed';

interface AttributeCreateRouletteModalProps {
  open: boolean;
  userLevel: number;
  targetAttribute: Attribute;
  onComplete: () => void;
}

const SPIN_INTERVAL_MS = 90;
const SPIN_TICKS = 18;
const CONFIRMED_DELAY_MS = 1400;

export function AttributeCreateRouletteModal({
  open,
  userLevel,
  targetAttribute,
  onComplete,
}: AttributeCreateRouletteModalProps) {
  const [phase, setPhase] = useState<CreateRoulettePhase>('spinning');
  const [displayAttribute, setDisplayAttribute] = useState<Attribute>('attack');
  const spinTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) {
      setPhase('spinning');
      setDisplayAttribute('attack');
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      if (completeTimerRef.current != null) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      return;
    }

    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const unlocked = getUnlockedAttributes(userLevel);
    setPhase('spinning');
    setDisplayAttribute(unlocked[0] ?? targetAttribute);

    let tick = 0;
    spinTimerRef.current = window.setInterval(() => {
      tick += 1;
      const index = tick % unlocked.length;
      setDisplayAttribute(unlocked[index] ?? targetAttribute);
      if (tick >= SPIN_TICKS) {
        if (spinTimerRef.current != null) {
          window.clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        setDisplayAttribute(targetAttribute);
        setPhase('confirmed');
      }
    }, SPIN_INTERVAL_MS);

    return () => {
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
        spinTimerRef.current = null;
      }
    };
  }, [open, targetAttribute, userLevel]);

  useEffect(() => {
    if (!open || phase !== 'confirmed') return;

    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null;
      onCompleteRef.current();
    }, CONFIRMED_DELAY_MS);

    return () => {
      if (completeTimerRef.current != null) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };
  }, [open, phase]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
      }
      if (completeTimerRef.current != null) {
        window.clearTimeout(completeTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const confirmedMeta = getAttributeMeta(targetAttribute);
  const phaseTitle =
    phase === 'spinning' ? '属性抽選中！' : `${confirmedMeta.ariaName}に決定！`;

  return createPortal(
    <div className="attribute-edit-backdrop attribute-create-roulette-backdrop">
      <div
        className="attribute-edit-panel attribute-edit-panel--retouch-result attribute-create-roulette-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-create-roulette-title"
        aria-live="polite"
      >
        <h2 id="attribute-create-roulette-title" className="attribute-edit-title">
          {phaseTitle}
        </h2>

        <div className="attribute-retouch-result attribute-create-roulette-result">
          <div
            className={[
              'attribute-retouch-badge-wrap',
              'attribute-create-roulette-badge-wrap',
              phase === 'spinning'
                ? 'attribute-retouch-badge-wrap--spinning'
                : 'attribute-create-roulette-badge-wrap--confirmed',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={
              phase === 'confirmed' ? confirmedMeta.ariaName : '属性抽選中'
            }
          >
            <AttributeBadge attribute={displayAttribute} size="deck" />
            {phase === 'confirmed' && (
              <span
                className="attribute-create-roulette-glow"
                aria-hidden
              />
            )}
          </div>
          {phase === 'confirmed' && (
            <p className="attribute-create-roulette-confirmed muted">
              {confirmedMeta.label}（{confirmedMeta.ariaName}）が付与されました
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
