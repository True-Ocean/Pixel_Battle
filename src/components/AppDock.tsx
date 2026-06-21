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
}

export function AppDock({ activeTab, onSelect }: AppDockProps) {
  return (
    <nav className="app-dock" aria-label="メインメニュー">
      {DOCK_ITEMS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={`app-dock-item${activeTab === id ? ' is-active' : ''}`}
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <span className="app-dock-icon" aria-hidden>
            {icon}
          </span>
          <span className="app-dock-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
