import type { TabId } from '../navigation/screenIds';

interface DockItem {
  id: TabId;
  label: string;
  icon: string;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'deck', label: 'マイデッキ', icon: '🃏' },
  { id: 'mission', label: 'ミッション', icon: '🎯' },
  { id: 'battleHub', label: 'バトル', icon: '⚔️' },
  { id: 'shop', label: 'ショップ', icon: '🛒' },
  { id: 'inventory', label: '所持品', icon: '🎒' },
];

interface AppDockProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  tabBadges?: Partial<Record<TabId, number>>;
}

export function AppDock({ activeTab, onSelect, tabBadges }: AppDockProps) {
  return (
    <nav className="app-dock" aria-label="メインメニュー">
      {DOCK_ITEMS.map(({ id, label, icon }) => {
        const badgeCount = tabBadges?.[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            className={`app-dock-item${activeTab === id ? ' is-active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <span className="app-dock-icon-wrap">
              <span className="app-dock-icon" aria-hidden>
                {icon}
              </span>
              {badgeCount > 0 && (
                <span className="app-dock-badge" aria-label={`未受取${badgeCount}件`}>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </span>
            <span className="app-dock-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
