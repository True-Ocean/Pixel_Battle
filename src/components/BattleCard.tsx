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
  /** 回復演出のキラキラ光 */
  healSparkle?: boolean;
  /** 弓の残り矢数（戦闘中のみ渡す。0 で非表示） */
  bowArrowsRemaining?: number;
  /** 癒の残り回復回数（戦闘中のみ渡す。0 で非表示） */
  healUsesRemaining?: number;
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
  maxBp,
  variant = 'board',
  focused = false,
  cpuTurnFocus = false,
  hasShield = false,
  poisonStackCount = 0,
  poisonDamagePerTurn = 0,
  poisonJustApplied = false,
  healSparkle = false,
  bowArrowsRemaining,
  healUsesRemaining,
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
    healSparkle ? 'heal-sparkle' : '',
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

  const isWounded = maxBp != null && !dead && currentBp < maxBp;
  const showBowArrows =
    attribute === 'bow' &&
    bowArrowsRemaining !== undefined &&
    bowArrowsRemaining > 0;
  const showHealUses =
    attribute === 'heal' &&
    healUsesRemaining !== undefined &&
    healUsesRemaining > 0;
  const shieldLabel = hasShield ? '（盾あり）' : '';
  const poisonLabel =
    poisonStackCount > 0
      ? `（毒×${poisonStackCount}、毎ターン${poisonDamagePerTurn}）`
      : '';
  const bowLabel = showBowArrows ? `（矢${bowArrowsRemaining}）` : '';
  const healLabel = showHealUses ? `（回復${healUsesRemaining}）` : '';

  const front = (
    <>
      {slotLabel && <span className="battle-card-slot">{slotLabel}</span>}
      {animatedBp?.active ? (
        <AnimatedBp
          from={animatedBp.from}
          to={animatedBp.to}
          active
          maxBp={maxBp}
          className="battle-card-bp"
        />
      ) : (
        !hideBp && (
          <span
            className={`battle-card-bp${isWounded ? ' bp-wounded' : ''}`}
            aria-label={`BP ${currentBp}${maxBp != null ? ` / ${maxBp}` : ''}`}
          >
            {currentBp}
          </span>
        )
      )}
      {(hasShield ||
        poisonStackCount > 0 ||
        showBowArrows ||
        showHealUses) && (
        <div className="battle-card-buffs" aria-hidden>
          {hasShield && (
            <span className="battle-card-buff-icon battle-card-buff-shield">🛡</span>
          )}
          {showBowArrows && (
            <span
              className="battle-card-buff-icon battle-card-buff-arrow"
              title={`矢${bowArrowsRemaining}`}
            >
              <svg
                className="battle-card-arrow-glyph"
                viewBox="0 0 10 10"
                aria-hidden
              >
                <line
                  x1="1.2"
                  y1="5"
                  x2="6.8"
                  y2="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M6.8 5 L4 2.2 M6.8 5 L4 7.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {bowArrowsRemaining > 1 ? bowArrowsRemaining : ''}
            </span>
          )}
          {showHealUses && (
            <span
              className="battle-card-buff-icon battle-card-buff-heal"
              title={`回復${healUsesRemaining}`}
            >
              🧪{healUsesRemaining > 1 ? healUsesRemaining : ''}
            </span>
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
        {healSparkle && <div className="battle-card-heal-sparkle" aria-hidden />}
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
    : `${name} ${attrMeta.ariaName} BP${currentBp}${shieldLabel}${bowLabel}${healLabel}${poisonLabel}`;

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
