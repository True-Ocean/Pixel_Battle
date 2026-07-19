import { useState } from 'react';
import { getSeriousBattleModeHelp } from '../config/helpContent';
import { BattleModeHeader } from './BattleModeHeader';
import { HelpPanelModal } from './HelpPanelModal';

export function SeriousBattleComingSoonScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const modeHelp = getSeriousBattleModeHelp();

  return (
    <section className="screen serious-battle-coming-soon-screen">
      <header className="serious-battle-coming-soon-header">
        <BattleModeHeader
          mode="serious"
          onHelp={() => setHelpOpen(true)}
          helpAriaLabel={`${modeHelp.title}のヘルプ`}
        />
      </header>

      <div className="serious-battle-coming-soon-body">
        <div className="serious-battle-coming-soon-mark" aria-hidden>
          <span>⚔</span>
        </div>
        <h2>現在開発中です</h2>
        <p>
          他のユーザーとリアルタイムでマッチングし、
          真剣勝負を楽しめるモードを準備しています。
        </p>
      </div>
      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          バトルモード選択画面に戻る
        </button>
      </div>
      {helpOpen && (
        <HelpPanelModal topic={modeHelp} onClose={() => setHelpOpen(false)} />
      )}
    </section>
  );
}
