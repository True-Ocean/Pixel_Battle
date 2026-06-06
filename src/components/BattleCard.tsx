import type { Attribute, PixelGrid } from '../types';
import { AnimatedHp } from './AnimatedHp';
import { CardBack } from './CardBack';
import { CardPreview } from './CardPreview';

export type BattleCardVariant = 'board' | 'compact';
export type ClashAnimRole = 'player' | 'cpu';

export interface BattleCardProps {
  name: string;
  pixels: PixelGrid;
  attribute: Attribute;
  currentHp: number;
  maxHp?: number;
  variant?: BattleCardVariant;
  focused?: boolean;
  cpuTurnFocus?: boolean;
  hasShield?: boolean;
  defenseShieldUsed?: boolean;
  dead?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  slotLabel?: string;
  clashAnim?: ClashAnimRole;
  hideHp?: boolean;
  dimmed?: boolean;
  inClash?: boolean;
  arenaSize?: boolean;
  animatedHp?: { from: number; to: number; active: boolean };
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
  currentHp,
  variant = 'board',
  focused = false,
  cpuTurnFocus = false,
  hasShield = false,
  defenseShieldUsed = false,
  dead = false,
  interactive = false,
  selected = false,
  onClick,
  slotLabel,
  clashAnim,
  hideHp = false,
  dimmed = false,
  inClash = false,
  arenaSize = false,
  animatedHp,
  faceDown = false,
  flipEnabled: _flipEnabled = false,
  justPlaced = false,
  fixedSize = false,
  handSize = false,
  side,
  outcomeOverlay,
}: BattleCardProps) {
  const attrLabel = attribute === 'attack' ? '攻撃' : '防御';
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

  const front = (
    <>
      {slotLabel && <span className="battle-card-slot">{slotLabel}</span>}
      {animatedHp?.active ? (
        <AnimatedHp
          from={animatedHp.from}
          to={animatedHp.to}
          active
          className="battle-card-hp"
        />
      ) : (
        !hideHp && (
          <span className="battle-card-hp" aria-label={`HP ${currentHp}`}>
            {currentHp}
          </span>
        )
      )}
      {hasShield && (
        <div className="battle-card-buffs" aria-hidden>
          <span className="battle-card-buff-icon battle-card-buff-shield">🛡</span>
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
      <span className="battle-card-attr">{attrLabel}</span>
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
    : `${name} ${attrLabel} HP${currentHp}${shieldLabel}`;

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
