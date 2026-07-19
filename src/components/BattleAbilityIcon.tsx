import { ShieldEmblem } from './ShieldEmblem';

export type BattleAbilityIconKind = 'shield' | 'bow' | 'heal' | 'storm';

interface BattleAbilityIconProps {
  kind: BattleAbilityIconKind;
}

/** バトルカード下部に表示する、残り能力1回分のアイコン */
export function BattleAbilityIcon({ kind }: BattleAbilityIconProps) {
  if (kind === 'shield') {
    return (
      <span className="battle-card-ability-icon battle-card-ability-icon--shield">
        <ShieldEmblem variant="grant" />
      </span>
    );
  }

  return (
    <svg
      className={`battle-card-ability-icon battle-card-ability-icon--${kind}`}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'bow' && (
        <>
          <path
            d="M5 3.2c4.2 3.5 4.2 10.1 0 13.6M5 3.2c-1.6 3.9-1.6 9.7 0 13.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M3.8 10h12.4M13.2 6.9 16.4 10l-3.2 3.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'heal' && (
        <>
          <path
            d="M7.4 2.8h5.2M8.2 2.8v4.1l-3.4 6.6c-.8 1.6.3 3.5 2.1 3.5h6.2c1.8 0 2.9-1.9 2.1-3.5l-3.4-6.6V2.8"
            fill="#d7f6ff"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.8 12.1h6.4"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === 'storm' && (
        <>
          <path
            d="M3 6.1h8.6c2.2 0 2.7-3.1.4-3.5-1.1-.2-2 .5-2.1 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M2.5 9.8h12.2c2.7 0 3.1 3.7.5 4.2-1.3.2-2.4-.7-2.4-1.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M4.2 13.5h5.2c1.9 0 2.1 2.7.3 3-1 .2-1.7-.4-1.8-1.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
