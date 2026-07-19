import { HelpInfoButton } from './HelpInfoButton';

export type BattleModeHeaderMode =
  | 'cpu'
  | 'offlinePvp'
  | 'friend'
  | 'serious'
  | 'records';

const MODE_COPY: Record<
  BattleModeHeaderMode,
  { title: string; description: string; online: boolean; developing?: boolean }
> = {
  cpu: {
    title: 'CPU戦',
    description: 'CPUを相手に腕試し',
    online: false,
  },
  offlinePvp: {
    title: '公開デッキ戦',
    description: '他ユーザーのデッキで腕試し',
    online: false,
  },
  friend: {
    title: 'フレンド対戦',
    description: '友達とリアルタイムバトル',
    online: true,
  },
  serious: {
    title: '真剣勝負！',
    description: '他ユーザーとリアルタイムバトル',
    online: true,
    developing: true,
  },
  records: {
    title: 'バトル履歴とランキング',
    description: '戦績やランキングを確認',
    online: false,
  },
};

export function BattleModeIcon({ mode }: { mode: BattleModeHeaderMode }) {
  if (mode === 'cpu') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <rect x="7" y="7" width="18" height="18" rx="4" />
        <path d="M12 13h8v6h-8zM4 11h3M4 16h3M4 21h3M25 11h3M25 16h3M25 21h3M11 4v3M16 4v3M21 4v3M11 25v3M16 25v3M21 25v3" />
        <circle cx="14" cy="16" r="1" className="battle-mode-icon-fill" />
        <circle cx="19" cy="16" r="1" className="battle-mode-icon-fill" />
      </svg>
    );
  }
  if (mode === 'offlinePvp') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <rect
          x="4.5"
          y="7.5"
          width="8"
          height="17"
          rx="2"
          transform="rotate(-7 8.5 16)"
        />
        <rect
          x="19.5"
          y="7.5"
          width="8"
          height="17"
          rx="2"
          transform="rotate(7 23.5 16)"
        />
      </svg>
    );
  }
  if (mode === 'friend') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <circle cx="11" cy="11" r="4" />
        <circle cx="22" cy="12" r="3.5" />
        <path d="M4.5 25c.5-5 3-7.5 6.5-7.5s6 2.5 6.5 7.5M17 25c.3-3.8 2.2-6 5-6s4.7 2.2 5 6M14 13.5l5-1" />
      </svg>
    );
  }
  if (mode === 'records') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <path d="M6 26V16h5v10M14 26V10h5v16M22 26V5h5v21M4 26h25" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4 25 7v7c0 6-3.5 10.5-9 14-5.5-3.5-9-8-9-14V7l9-3Z" />
      <path d="m11 15 3 3 7-7" />
    </svg>
  );
}

export function OnlineNetworkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3c2.6 2.5 4 5.5 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.5-4-9s1.4-6.5 4-9ZM5.5 7.5h13M5.5 16.5h13" />
    </svg>
  );
}

export function BattleModeHeader({
  mode,
  onHelp,
  helpAriaLabel,
}: {
  mode: BattleModeHeaderMode;
  onHelp?: () => void;
  helpAriaLabel?: string;
}) {
  const copy = MODE_COPY[mode];
  return (
    <div className={`battle-mode-header battle-mode-header--${mode}`}>
      <span className="battle-mode-header-icon">
        <BattleModeIcon mode={mode} />
      </span>
      <div className="battle-mode-header-copy">
        <div className="battle-mode-header-title-row">
          <h1 className="battle-mode-header-title">{copy.title}</h1>
          {copy.online && (
            <span
              className="battle-mode-header-online"
              role="img"
              aria-label="オンライン通信"
            >
              <OnlineNetworkIcon />
            </span>
          )}
        </div>
        <span className="battle-mode-header-description">
          {copy.description}
        </span>
        {copy.developing && (
          <span className="battle-mode-header-status">（開発中）</span>
        )}
      </div>
      {onHelp && (
        <div className="battle-mode-header-actions">
          <HelpInfoButton
            className="battle-mode-header-help"
            ariaLabel={helpAriaLabel ?? `${copy.title}のヘルプ`}
            onClick={onHelp}
          />
        </div>
      )}
    </div>
  );
}
