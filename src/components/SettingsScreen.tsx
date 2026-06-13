import { useEffect, useState, type ReactNode } from 'react';
import { DECK_SLOT_COUNT, MAX_USER_LEVEL } from '../config/balance';
import { clampUnlockedDeckCount } from '../deckSlots';
import { DEV_USER_LEVEL_OVERRIDE } from '../config/devUserLevel';
import { getLevelProgress } from '../user';
import type { UserProfile } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsScreenProps {
  user: UserProfile | null;
  unlockedDeckCount: number;
  onResetBattleRecords: () => void;
  onDevSetLevel: (level: number) => void;
  onDevSetUnlockedDeckCount: (count: number) => void;
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
  onResetBattleRecords,
  onDevSetLevel,
  onDevSetUnlockedDeckCount,
}: SettingsScreenProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [devLevelInput, setDevLevelInput] = useState(
    () => String(user?.level ?? 1),
  );
  const [devDeckUnlockInput, setDevDeckUnlockInput] = useState(
    () => String(unlockedDeckCount),
  );
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [devDeckNotice, setDevDeckNotice] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    setDevLevelInput(String(user?.level ?? 1));
  }, [user?.level]);

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
            <SettingsRow
              label="ファイル上書き"
              value={
                DEV_USER_LEVEL_OVERRIDE == null
                  ? 'なし'
                  : `Lv.${DEV_USER_LEVEL_OVERRIDE}（リロード後も有効）`
              }
            />
            <div className="settings-dev-level">
              <label className="settings-dev-level-label" htmlFor="settings-dev-level">
                テスト用レベル
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
            <div className="settings-dev-level">
              <label
                className="settings-dev-level-label"
                htmlFor="settings-dev-deck-unlock"
              >
                デッキ解放数
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
                  onChange={(event) => setDevDeckUnlockInput(event.target.value)}
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
            <p className="settings-section-note muted">
              開発ビルドのみ表示。「適用」でセーブデータのレベル・EXP・カード BP
              またはデッキ解放数を更新します。ファイル上書き（上記）より優先されます。dev-user-level
              スキルでファイル上書きを変更した場合は、そちらが再び優先されます。
            </p>
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
