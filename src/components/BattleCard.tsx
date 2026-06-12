import { getAttributeMeta } from '../config/attributes';
import type { Attribute, PixelGrid } from '../types';
import { AnimatedBp } from './AnimatedBp';
import { AttributeBadge } from './AttributeBadge';
import { CardBack } from './CardBack';
import { CardPreview } from './CardPreview';

export type BattleCardVariant = 'board' | 'compact';
export type ClashAnimRole = 'player' | 'cpu';

export interface BattleCardProps {
  name: string;
  pixels: PixelGrid;
  attribute: Attribute;
  currentBp: number;
  maxBp?: number;
  variant?: BattleCardVariant;
  focused?: boolean;
  cpuTurnFocus?: boolean;
  hasShield?: boolean;
  /** 毒スタック数（0 なら非表示） */
  poisonStackCount?: number;
  /** 毎ターンの毒ダメージ合計（ツールチップ用） */
  poisonDamagePerTurn?: number;
  /** このターンに毒が付与された演出 */
  poisonJustApplied?: boolean;
  defenseShieldUsed?: boolean;
  dead?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  slotLabel?: string;
  clashAnim?: ClashAnimRole;
  hideBp?: boolean;
  dimmed?: boolean;
  inClash?: boolean;
  arenaSize?: boolean;
  animatedBp?: { from: number; to: number; active: boolean };
  /** 裏向き表示 */
  faceDown?: boolean;
  /** 表裏フリップ用（対戦準備の相手手札など） */
  flipEnabled?: boolean;
  /** スロット配置時のポップ演出 */
  justPlaced?: boolean;
  /** 対戦準備・スロット用の固定サイズ */
  fixedSize?: boolean;
  /** 対戦準備・手札5枚並び用 */
  handSize?: boolean;
  /** 相手側 / 味方側の配色 */
  side?: 'cpu' | 'player';
  /** 戦闘終了時の WIN / LOSE 表示 */
  outcomeOverlay?: 'win' | 'lose';
}

export function BattleCard({
  name,
  pixels,
  attribute,
  currentBp,
  variant = 'board',
  focused = false,
  cpuTurnFocus = false,
  hasShield = false,
  poisonStackCount = 0,
  poisonDamagePerTurn = 0,
  poisonJustApplied = false,
  defenseShieldUsed = false,
  dead = false,
  interactive = false,
  selected = false,
  onClick,
  slotLabel,
  clashAnim,
  hideBp = false,
  dimmed = false,
  inClash = false,
  arenaSize = false,
  animatedBp,
  faceDown = false,
  flipEnabled: _flipEnabled = false,
  justPlaced = false,
  fixedSize = false,
  handSize = false,
  side,
  outcomeOverlay,
}: BattleCardProps) {
  const attrMeta = getAttributeMeta(attribute);
  const classNames = [
    'battle-card',
    variant,
    arenaSize ? 'arena-size' : '',
    fixedSize ? 'setup-card-fixed' : '',
    handSize ? 'setup-hand-card' : '',
    justPlaced ? 'just-placed' : '',
    dead ? 'dead' : '',
    focused ? 'focused' : '',
    cpuTurnFocus ? 'cpu-focus' : '',
    hasShield ? 'has-shield' : '',
    poisonStackCount > 0 ? 'has-poison' : '',
    poisonJustApplied ? 'poison-just-applied' : '',
    interactive ? 'interactive' : '',
    selected ? 'selected' : '',
    clashAnim === 'player' ? 'clash-card-player' : '',
    clashAnim === 'cpu' ? 'clash-card-cpu' : '',
    dimmed ? 'dimmed' : '',
    inClash ? 'in-clash-slot' : '',
    side === 'cpu' ? 'battle-side-cpu' : '',
    side === 'player' ? 'battle-side-player' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shieldLabel = hasShield ? '（盾あり）' : '';
  const poisonLabel =
    poisonStackCount > 0
      ? `（毒×${poisonStackCount}、毎ターン${poisonDamagePerTurn}）`
      : '';

  const front = (
    <>
      {slotLabel && <span className="battle-card-slot">{slotLabel}</span>}
      {animatedBp?.active ? (
        <AnimatedBp
          from={animatedBp.from}
          to={animatedBp.to}
          active
          className="battle-card-bp"
        />
      ) : (
        !hideBp && (
          <span className="battle-card-bp" aria-label={`BP ${currentBp}`}>
            {currentBp}
          </span>
        )
      )}
      {(hasShield || poisonStackCount > 0) && (
        <div className="battle-card-buffs" aria-hidden>
          {hasShield && (
            <span className="battle-card-buff-icon battle-card-buff-shield">🛡</span>
          )}
          {poisonStackCount > 0 && (
            <span
              className="battle-card-buff-icon battle-card-buff-poison"
              title={`毒×${poisonStackCount}（毎ターン${poisonDamagePerTurn}）`}
            >
              ☠{poisonStackCount > 1 ? poisonStackCount : ''}
            </span>
          )}
        </div>
      )}
      {outcomeOverlay && (
        <div
          className={`battle-card-outcome battle-card-outcome-${outcomeOverlay}`}
          aria-hidden
        >
          {outcomeOverlay === 'win' ? 'WIN' : 'LOSE'}
        </div>
      )}
      <div className="battle-card-art">
        <CardPreview pixels={pixels} />
      </div>
      <AttributeBadge attribute={attribute} className="battle-card-attr" />
      {defenseShieldUsed && (
        <span className="battle-card-badge" title="盾付与済">
          付与済
        </span>
      )}
      <span className="battle-card-name">{name}</span>
    </>
  );

  if (inClash) {
    return <div className="battle-card-slot-placeholder" aria-hidden />;
  }

  const ariaLabel = faceDown
    ? '裏向きのカード'
    : `${name} ${attrMeta.ariaName} BP${currentBp}${shieldLabel}${poisonLabel}`;

  // 裏向きは CardBack を直接描画（iOS Safari で rotateY フリップが反転表示になるため）
  const content = faceDown ? (
    <div className="battle-card-static-back">
      <CardBack side={side} />
    </div>
  ) : (
    front
  );

  if (interactive && onClick && !dead && !faceDown) {
    return (
      <button
        type="button"
        className={classNames}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classNames} aria-label={ariaLabel}>
      {content}
    </div>
  );
}
