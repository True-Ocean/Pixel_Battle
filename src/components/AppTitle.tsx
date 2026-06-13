interface AppTitleProps {
  className?: string;
}

export function AppTitle({ className }: AppTitleProps) {
  return (
    <h1
      className={['app-title', className].filter(Boolean).join(' ')}
      aria-label="簡単！真剣！お絵描きピクセルバトル！"
    >
      <span className="app-title-hooks">
        <span className="app-title-easy">簡単！</span>
        <span className="app-title-serious">真剣！</span>
      </span>
      <span className="app-title-main">
        <span className="app-title-oekaki">お絵描き</span>
        <span className="app-title-pixel">ピクセル</span>
        <span className="app-title-battle">バトル！</span>
      </span>
    </h1>
  );
}
