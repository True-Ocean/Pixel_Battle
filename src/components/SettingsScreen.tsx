import { useEffect, useState, type ReactNode } from 'react';
import {
  DECK_SLOT_COUNT,
  DECK_SLOT_INITIAL_UNLOCKED,
  MAX_USER_LEVEL,
} from '../config/balance';
import { clampUnlockedDeckCount } from '../deckSlots';
import { getLevelProgress } from '../user';
import type { UserProfile } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface DevCardOption {
  id: string;
  label: string;
  isLost: boolean;
}

interface DevDeckFillOption {
  index: number;
  label: string;
  emptySlots: number;
  locked: boolean;
}

interface SettingsScreenProps {
  user: UserProfile | null;
  unlockedDeckCount: number;
  freePixels: number;
  devCardOptions: DevCardOption[];
  devDeckFillOptions: DevDeckFillOption[];
  onResetBattleRecords: () => void;
  onDevSetLevel: (level: number) => void;
  onDevSetUnlockedDeckCount: (count: number) => void;
  onDevSetFreePixels: (amount: number) => void;
  onDevMarkCardLost: (cardId: string) => string;
  onDevFillDeckSlots: (deckIndex: number) => string;
}

interface PlaceholderRow {
  label: string;
  hint: string;
}

const FUTURE_ROWS: PlaceholderRow[] = [
  { label: '通知設定', hint: '準備中' },
  { label: 'サウンド', hint: '準備中' },
  { label: 'アカウント連携', hint: '準備中' },
  { label: '利用規約', hint: '準備中' },
];

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function SettingsRow({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <span className="settings-row-value">
        {value ?? hint}
      </span>
    </div>
  );
}

export function SettingsScreen({
  user,
  unlockedDeckCount,
  freePixels,
  devCardOptions,
  devDeckFillOptions,
  onResetBattleRecords,
  onDevSetLevel,
  onDevSetUnlockedDeckCount,
  onDevSetFreePixels,
  onDevMarkCardLost,
  onDevFillDeckSlots,
}: SettingsScreenProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [devLevelInput, setDevLevelInput] = useState(
    () => String(user?.level ?? 1),
  );
  const [devDeckUnlockInput, setDevDeckUnlockInput] = useState(
    () => String(unlockedDeckCount || DECK_SLOT_INITIAL_UNLOCKED),
  );
  const [devFreePixelsInput, setDevFreePixelsInput] = useState(
    () => String(freePixels),
  );
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [devDeckNotice, setDevDeckNotice] = useState<string | null>(null);
  const [devPixelsNotice, setDevPixelsNotice] = useState<string | null>(null);
  const [devLostNotice, setDevLostNotice] = useState<string | null>(null);
  const [devFillNotice, setDevFillNotice] = useState<string | null>(null);
  const [devLostCardId, setDevLostCardId] = useState('');
  const [devFillDeckIndex, setDevFillDeckIndex] = useState(0);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    setDevFillDeckIndex((current) => {
      const currentOption = devDeckFillOptions.find(
        (option) => option.index === current,
      );
      if (
        currentOption &&
        !currentOption.locked &&
        currentOption.emptySlots > 0
      ) {
        return current;
      }
      return (
        devDeckFillOptions.find(
          (option) => !option.locked && option.emptySlots > 0,
        )?.index ??
        devDeckFillOptions.find((option) => !option.locked)?.index ??
        0
      );
    });
  }, [devDeckFillOptions]);

  useEffect(() => {
    setDevLostCardId((current) => {
      if (devCardOptions.length === 0) return '';
      const currentOption = devCardOptions.find((option) => option.id === current);
      if (currentOption && !currentOption.isLost) return current;
      return (
        devCardOptions.find((option) => !option.isLost)?.id ??
        devCardOptions[0].id
      );
    });
  }, [devCardOptions]);

  useEffect(() => {
    setDevLevelInput(String(user?.level ?? 1));
  }, [user?.level]);

  useEffect(() => {
    setDevFreePixelsInput(String(freePixels));
  }, [freePixels]);

  useEffect(() => {
    setDevDeckUnlockInput(String(unlockedDeckCount));
  }, [unlockedDeckCount]);

  if (!user) {
    return (
      <section className="screen screen-settings">
        <div className="settings-empty">
          <p className="muted">ユーザー情報がありません</p>
        </div>
      </section>
    );
  }

  const { progress, isMaxLevel } = getLevelProgress(user);
  const percent = Math.round(progress * 100);

  const handleDevApply = () => {
    const parsed = Number.parseInt(devLevelInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_USER_LEVEL) {
      setDevNotice(`レベルは 1〜${MAX_USER_LEVEL} の整数を入力してください。`);
      return;
    }
    onDevSetLevel(parsed);
    setDevNotice(`Lv.${parsed} に変更しました。既存カードの BP も再算出されます。`);
  };

  const handleDevDeckUnlockApply = () => {
    const parsed = Number.parseInt(devDeckUnlockInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > DECK_SLOT_COUNT) {
      setDevDeckNotice(
        `デッキ解放数は 1〜${DECK_SLOT_COUNT} の整数を入力してください。`,
      );
      return;
    }
    const clamped = clampUnlockedDeckCount(parsed);
    onDevSetUnlockedDeckCount(clamped);
    setDevDeckUnlockInput(String(clamped));
    setDevDeckNotice(`デッキ解放数を ${clamped} に変更しました。`);
  };

  const handleDevFreePixelsApply = () => {
    const parsed = Number.parseInt(devFreePixelsInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDevPixelsNotice('pxコインは 0 以上の整数を入力してください。');
      return;
    }
    onDevSetFreePixels(parsed);
    setDevPixelsNotice(`pxコインを ${parsed.toLocaleString()} に変更しました。`);
  };

  const handleDevMarkCardLost = () => {
    setDevLostNotice(onDevMarkCardLost(devLostCardId));
  };

  const handleDevFillDeckSlots = () => {
    setDevFillNotice(onDevFillDeckSlots(devFillDeckIndex));
  };

  const selectedDevCard = devCardOptions.find((option) => option.id === devLostCardId);
  const selectedDevFillDeck = devDeckFillOptions.find(
    (option) => option.index === devFillDeckIndex,
  );

  return (
    <section className="screen screen-settings">
      <div className="settings-scroll">
        <SettingsSection title="アカウント">
          <SettingsRow label="ユーザー名" value={user.username} />
          <SettingsRow label="レベル" value={`Lv.${user.level}`} />
          <SettingsRow
            label="戦績"
            value={`${user.battleWins}勝 ${user.battleLosses}敗`}
          />
          <div className="settings-progress-wrap">
            <div className="settings-progress-label">
              {isMaxLevel ? 'レベル上限' : `次のレベルまで ${percent}%`}
            </div>
            <div
              className={`settings-progress${isMaxLevel ? ' is-max' : ''}`}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="settings-progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="データ">
          <p className="settings-section-note muted">
            デッキの内容とユーザー名は維持されます。
          </p>
          <button
            type="button"
            className="settings-action-btn settings-action-btn-danger"
            onClick={() => setResetOpen(true)}
          >
            戦績をリセット
          </button>
        </SettingsSection>

        {isDev && (
          <SettingsSection title="開発">
            <div className="settings-dev-quick-row">
              <div className="settings-dev-quick-cell settings-dev-quick-cell--compact">
                <label
                  className="settings-dev-level-label"
                  htmlFor="settings-dev-level"
                >
                  レベル
                </label>
                <div className="settings-dev-level-row">
                  <input
                    id="settings-dev-level"
                    type="number"
                    min={1}
                    max={MAX_USER_LEVEL}
                    step={1}
                    className="settings-dev-level-input"
                    value={devLevelInput}
                    onChange={(event) => setDevLevelInput(event.target.value)}
                  />
                  <button
                    type="button"
                    className="settings-dev-level-apply"
                    onClick={handleDevApply}
                  >
                    適用
                  </button>
                </div>
              </div>
              <div className="settings-dev-quick-cell settings-dev-quick-cell--compact">
                <label
                  className="settings-dev-level-label"
                  htmlFor="settings-dev-deck-unlock"
                >
                  デッキ数
                </label>
                <div className="settings-dev-level-row">
                  <input
                    id="settings-dev-deck-unlock"
                    type="number"
                    min={1}
                    max={DECK_SLOT_COUNT}
                    step={1}
                    className="settings-dev-level-input"
                    value={devDeckUnlockInput}
                    onChange={(event) =>
                      setDevDeckUnlockInput(event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="settings-dev-level-apply"
                    onClick={handleDevDeckUnlockApply}
                  >
                    適用
                  </button>
                </div>
              </div>
              <div className="settings-dev-quick-cell settings-dev-quick-cell--wide">
                <label
                  className="settings-dev-level-label"
                  htmlFor="settings-dev-free-pixels"
                >
                  pxコイン
                </label>
                <div className="settings-dev-level-row">
                  <input
                    id="settings-dev-free-pixels"
                    type="number"
                    min={0}
                    step={1}
                    className="settings-dev-level-input"
                    value={devFreePixelsInput}
                    onChange={(event) =>
                      setDevFreePixelsInput(event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="settings-dev-level-apply"
                    onClick={handleDevFreePixelsApply}
                  >
                    適用
                  </button>
                </div>
              </div>
            </div>
            <div className="settings-dev-level">
              <label
                className="settings-dev-level-label"
                htmlFor="settings-dev-fill-deck"
              >
                デッキ自動生成（空きスロット）
              </label>
              <div className="settings-dev-level-row">
                <select
                  id="settings-dev-fill-deck"
                  className="settings-dev-level-input settings-dev-level-select"
                  value={String(devFillDeckIndex)}
                  onChange={(event) =>
                    setDevFillDeckIndex(Number.parseInt(event.target.value, 10))
                  }
                >
                  {devDeckFillOptions.map((option) => (
                    <option
                      key={option.index}
                      value={option.index}
                      disabled={option.locked}
                    >
                      {option.label}
                      {option.locked
                        ? ' · 未解放'
                        : option.emptySlots === 0
                          ? ' · 満杯'
                          : ` · 空き${option.emptySlots}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="settings-dev-level-apply"
                  disabled={
                    !selectedDevFillDeck ||
                    selectedDevFillDeck.locked ||
                    selectedDevFillDeck.emptySlots === 0
                  }
                  onClick={handleDevFillDeckSlots}
                >
                  生成
                </button>
              </div>
            </div>
            <div className="settings-dev-level">
              <label
                className="settings-dev-level-label"
                htmlFor="settings-dev-lost-card"
              >
                Lost 化するカード
              </label>
              <div className="settings-dev-level-row">
                <select
                  id="settings-dev-lost-card"
                  className="settings-dev-level-input settings-dev-level-select"
                  value={devLostCardId}
                  disabled={devCardOptions.length === 0}
                  onChange={(event) => setDevLostCardId(event.target.value)}
                >
                  {devCardOptions.length === 0 ? (
                    <option value="">カードがありません</option>
                  ) : (
                    devCardOptions.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={option.isLost}
                      >
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="settings-dev-level-apply"
                  disabled={!selectedDevCard || selectedDevCard.isLost}
                  onClick={handleDevMarkCardLost}
                >
                  Lost にする
                </button>
              </div>
            </div>
            {devNotice && (
              <p className="settings-dev-notice" role="status">
                {devNotice}
              </p>
            )}
            {devDeckNotice && (
              <p className="settings-dev-notice" role="status">
                {devDeckNotice}
              </p>
            )}
            {devPixelsNotice && (
              <p className="settings-dev-notice" role="status">
                {devPixelsNotice}
              </p>
            )}
            {devLostNotice && (
              <p className="settings-dev-notice" role="status">
                {devLostNotice}
              </p>
            )}
            {devFillNotice && (
              <p className="settings-dev-notice" role="status">
                {devFillNotice}
              </p>
            )}
          </SettingsSection>
        )}

        <SettingsSection title="その他">
          {FUTURE_ROWS.map((row) => (
            <SettingsRow key={row.label} label={row.label} hint={row.hint} />
          ))}
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="戦績をリセット"
        message="ユーザー戦績・カード戦績・対戦履歴をすべて初期化します。デッキの内容とユーザー名は維持されます。"
        confirmLabel="リセット"
        cancelLabel="キャンセル"
        confirmVariant="danger"
        onConfirm={() => {
          setResetOpen(false);
          onResetBattleRecords();
        }}
        onCancel={() => setResetOpen(false)}
      />
    </section>
  );
}
