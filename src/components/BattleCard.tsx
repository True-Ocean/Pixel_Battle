import type { CSSProperties } from 'react';
import { getAttributeMeta } from '../config/attributes';
import { getRarityMeta } from '../config/rarity';
import type { Attribute, CardRarity, PixelGrid } from '../types';
import { AnimatedBp } from './AnimatedBp';
import { AttributeBadge } from './AttributeBadge';
import {
  BattleAbilityIcon,
  type BattleAbilityIconKind,
} from './BattleAbilityIcon';
import { CardBack } from './CardBack';
import { CardPreview } from './CardPreview';
import { ShieldEmblem } from './ShieldEmblem';

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
  /** 凍結中（行動不能） */
  isFrozen?: boolean;
  /** 嵐の残り使用回数（戦闘中のみ渡す。0 で非表示） */
  stormUsesRemaining?: number;
  /** 照の残り照射回数（戦闘中のみ渡す。0 で非表示） */
  illuminateUsesRemaining?: number;
  /** 嵐攻撃の渦巻き演出（対象カード） */
  stormSwirl?: boolean;
  /** このターンに凍結が付与された演出 */
  freezeJustApplied?: boolean;
  /** 忍ステルス中 */
  isStealthed?: boolean;
  /** 目眩中 */
  isDazzled?: boolean;
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
  /** カードレア度（R/SR 以上は枠色で表示。N は陣営色のまま） */
  rarity?: CardRarity;
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
  isFrozen = false,
  freezeJustApplied = false,
  isStealthed = false,
  isDazzled = false,
  stormUsesRemaining,
  illuminateUsesRemaining,
  stormSwirl = false,
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
  justPlaced = false,
  fixedSize = false,
  handSize = false,
  side,
  rarity = 'N',
  outcomeOverlay,
}: BattleCardProps) {
  const attrMeta = getAttributeMeta(attribute);
  const showRarityFrame = rarity !== 'N' && !faceDown;
  const rarityMeta = showRarityFrame ? getRarityMeta(rarity) : null;
  const rarityStyle: CSSProperties | undefined = rarityMeta
    ? ({
        '--rarity-border': rarityMeta.rowBorder,
        '--rarity-bg': rarityMeta.rowBg,
        '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
      } as CSSProperties)
    : undefined;
  const classNames = [
    'battle-card',
    variant,
    showRarityFrame ? `battle-card--rarity-${rarity}` : '',
    arenaSize ? 'arena-size' : '',
    fixedSize ? 'setup-card-fixed' : '',
    handSize ? 'setup-hand-card' : '',
    justPlaced ? 'just-placed' : '',
    dead ? 'dead' : '',
    focused ? 'focused' : '',
    cpuTurnFocus ? 'cpu-focus' : '',
    hasShield ? 'has-shield' : '',
    poisonStackCount > 0 ? 'has-poison' : '',
    isFrozen ? 'has-freeze' : '',
    freezeJustApplied ? 'freeze-just-applied' : '',
    poisonJustApplied ? 'poison-just-applied' : '',
    stormSwirl ? 'storm-swirl-active' : '',
    isStealthed ? 'has-stealth' : '',
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
  const showStormUses =
    attribute === 'storm' &&
    stormUsesRemaining !== undefined &&
    stormUsesRemaining > 0;
  const showIlluminateUses =
    attribute === 'illuminate' &&
    illuminateUsesRemaining !== undefined &&
    illuminateUsesRemaining > 0;
  /** 盾属性かつ盾付与未使用 → 残り能力として盾1個 */
  const showGrantShield =
    attribute === 'defense' && !defenseShieldUsed && !dead;
  /** 現在盾を所持 → 画像中央の白い盾 */
  const showActiveShield = hasShield && !dead;
  const abilityIconKind: BattleAbilityIconKind | null = showGrantShield
    ? 'shield'
    : showBowArrows
      ? 'bow'
      : showHealUses
        ? 'heal'
        : showStormUses
          ? 'storm'
          : showIlluminateUses
            ? 'illuminate'
            : null;
  const abilityUsesRemaining = showGrantShield
    ? 1
    : showBowArrows
      ? (bowArrowsRemaining ?? 0)
      : showHealUses
        ? (healUsesRemaining ?? 0)
        : showStormUses
          ? (stormUsesRemaining ?? 0)
          : showIlluminateUses
            ? (illuminateUsesRemaining ?? 0)
            : 0;
  const showStatusIcons =
    poisonStackCount > 0 || isFrozen || isStealthed || isDazzled;
  const shieldLabel = hasShield ? '（盾あり）' : '';
  const grantShieldLabel = showGrantShield ? '（盾付与可）' : '';
  const poisonLabel =
    poisonStackCount > 0
      ? `（毒×${poisonStackCount}、毎ターン${poisonDamagePerTurn}）`
      : '';
  const bowLabel = showBowArrows ? `（矢${bowArrowsRemaining}）` : '';
  const healLabel = showHealUses ? `（回復${healUsesRemaining}）` : '';
  const freezeLabel = isFrozen ? '（凍結）' : '';
  const stealthLabel = isStealthed ? '（ステルス）' : '';
  const dazzleLabel = isDazzled ? '（目眩）' : '';
  const illuminateLabel = showIlluminateUses
    ? `（懐中電灯${illuminateUsesRemaining}）`
    : '';

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
      {showStatusIcons && (
        <div className="battle-card-buffs" aria-hidden>
          {isFrozen && (
            <span
              className="battle-card-buff-icon battle-card-buff-freeze"
              title="凍結（行動不能）"
            >
              ❄
            </span>
          )}
          {isStealthed && (
            <span
              className="battle-card-buff-icon battle-card-buff-stealth"
              title="ステルス"
            >
              忍
            </span>
          )}
          {isDazzled && (
            <span
              className="battle-card-buff-icon battle-card-buff-dazzle"
              title="目眩（BP低下）"
            >
              😵‍💫
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
        {showActiveShield && (
          <span className="battle-card-shield-active" title="盾あり" aria-hidden>
            <ShieldEmblem variant="active" />
          </span>
        )}
        {healSparkle && <div className="battle-card-heal-sparkle" aria-hidden />}
      </div>
      <AttributeBadge attribute={attribute} className="battle-card-attr" />
      {abilityIconKind && abilityUsesRemaining > 0 && (
        <span className="battle-card-ability-charges" aria-hidden>
          {Array.from({ length: abilityUsesRemaining }, (_, index) => (
            <BattleAbilityIcon
              key={`${abilityIconKind}-${index}`}
              kind={abilityIconKind}
            />
          ))}
        </span>
      )}
      <span className="battle-card-name">{name}</span>
      {poisonStackCount > 0 && (
        <div className="battle-card-poison-overlay" aria-hidden>
          <div className="battle-card-poison-mist" />
        </div>
      )}
      {isFrozen && (
        <div className="battle-card-freeze-overlay" aria-hidden>
          <div className="battle-card-freeze-crystals" />
        </div>
      )}
      {stormSwirl && (
        <div className="battle-card-storm-overlay" aria-hidden>
          <div className="battle-card-storm-vortex" />
          <div className="battle-card-storm-vortex battle-card-storm-vortex-inner" />
        </div>
      )}
      {isStealthed && (
        <div className="battle-card-stealth-overlay" aria-hidden>
          <div className="battle-card-stealth-veil" />
        </div>
      )}
    </>
  );

  if (inClash) {
    return <div className="battle-card-slot-placeholder" aria-hidden />;
  }

  const ariaLabel = faceDown
    ? '裏向きのカード'
    : `${name} ${attrMeta.ariaName} BP${currentBp}${shieldLabel}${grantShieldLabel}${bowLabel}${healLabel}${illuminateLabel}${freezeLabel}${stealthLabel}${dazzleLabel}${poisonLabel}`;

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
        style={rarityStyle}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classNames} style={rarityStyle} aria-label={ariaLabel}>
      {content}
    </div>
  );
}
