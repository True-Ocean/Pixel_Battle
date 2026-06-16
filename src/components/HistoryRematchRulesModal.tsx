import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PixelCoinIcon } from './PixelCoinIcon';

interface HistoryRematchRulesModalProps {
  onConfirm: (options: { suppressToday: boolean }) => void;
  onCancel: () => void;
}

export function HistoryRematchRulesModal({
  onConfirm,
  onCancel,
}: HistoryRematchRulesModalProps) {
  const [suppressToday, setSuppressToday] = useState(false);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return createPortal(
    <div className="history-rematch-rules-backdrop" onClick={onCancel}>
      <div
        className="history-rematch-rules-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-rematch-rules-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="history-rematch-rules-title" className="history-rematch-rules-title">
          再戦時のルール
        </h2>
        <ul className="history-rematch-rules-list">
          <li>ロストカードを含むデッキで対戦できます</li>
          <li>相手カードのBPはあなたのデッキに合わせて調整されます</li>
          <li>戦績や勝敗には記録されません</li>
          <li>敗北してもカードをロストしません</li>
          <li>
            報酬は
            <PixelCoinIcon className="history-rematch-rules-coin" aria-hidden />
            のみとなります
          </li>
        </ul>
        <label className="history-rematch-rules-dismiss">
          <input
            type="checkbox"
            checked={suppressToday}
            onChange={(event) => setSuppressToday(event.target.checked)}
          />
          <span>了解しました（今日はこれ以降表示しない）</span>
        </label>
        <div className="history-rematch-rules-actions">
          <button
            type="button"
            className="history-rematch-rules-confirm"
            onClick={() => onConfirm({ suppressToday })}
          >
            デッキを選ぶ
          </button>
          <button
            type="button"
            className="history-rematch-rules-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
