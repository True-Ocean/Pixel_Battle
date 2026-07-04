import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getDeviceLinkedEmail,
  linkEmailToCurrentUser,
  normalizeEmailInput,
  resolveAccountEmail,
  signInWithEmailMagicLink,
  signOutAccount,
  subscribeAuthState,
  syncDeviceLinkedEmailFromUser,
  unlinkAccountFromDevice,
  verifyEmailOtp,
  isEmailLinkedUser,
  type AuthActionResult,
  type EmailAuthPurpose,
} from '../auth';
import {
  DECK_SLOT_COUNT,
  DECK_SLOT_INITIAL_UNLOCKED,
  MAX_USER_LEVEL,
  USERNAME_MAX_LENGTH,
} from '../config/balance';
import {
  getMemoryAlbumCapacity,
  MEMORY_ALBUM_INITIAL_ROWS,
  MEMORY_ALBUM_MAX_EXPANSION_ROWS,
} from '../config/economy';
import { clampUnlockedDeckCount } from '../deckSlots';
import { isSupabaseConfigured } from '../supabase/client';
import { getLevelProgress, validateUsername } from '../user';
import type { SubscriptionPlan, UserProfile } from '../types';

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

export interface SettingsScreenProps {
  user: UserProfile | null;
  unlockedDeckCount: number;
  freePixels: number;
  jewels: number;
  attributeShardsCount: number;
  universalShardCount: number;
  talismanCount: number;
  subscriptionLabel: string;
  mockLifetimeSpendYen?: number;
  mockAdsWatchedTotal?: number;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  onBack?: () => void;
  devCardOptions: DevCardOption[];
  devDeckFillOptions: DevDeckFillOption[];
  onDevSetLevel: (level: number) => string;
  onDevSetUnlockedDeckCount: (count: number) => void;
  memoryAlbumUnlockedRows: number;
  onDevSetMemoryAlbumExpansionRows: (expansionRows: number) => void;
  onDevSetFreePixels: (amount: number) => void;
  onDevSetJewels: (amount: number) => void;
  onDevSetSubscription: (plan: SubscriptionPlan) => string;
  onDevSetAttributeShards: (count: number) => string;
  onDevSetUniversalShards: (count: number) => string;
  onDevSetTalisman: (count: number) => string;
  onDevMarkCardLost: (cardId: string) => string;
  onDevFillDeckSlots: (deckIndex: number) => string;
  onDevUnlockAllPaletteColors: () => string;
  onDevClearPaletteShopUnlocks: () => string;
  onDevUnlockAllEditorTools: () => string;
  onDevClearEditorShopUnlocks: () => string;
  /** メール連携済みのときクラウドと突き合わせる */
  onCloudSyncNow?: () => Promise<string>;
  /** ユーザー名変更（trim 済み・検証済み） */
  onUsernameChange: (username: string) => void;
}

interface PlaceholderRow {
  label: string;
  hint: string;
}

const FUTURE_ROWS: PlaceholderRow[] = [
  { label: '通知設定', hint: '準備中' },
  { label: '利用規約', hint: '準備中' },
];

function SettingsSection({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`settings-section${compact ? ' settings-section--compact' : ''}`}
    >
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

function SettingsToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="settings-row settings-row-toggle">
      <span className="settings-row-label">{label}</span>
      <button
        type="button"
        className={`settings-toggle${checked ? ' is-on' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-toggle-track">
          <span className="settings-toggle-thumb" />
        </span>
      </button>
    </div>
  );
}

function SettingsDevGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-dev-group">
      <h3 className="settings-dev-group-title">{title}</h3>
      {hint ? (
        <p className="settings-dev-group-hint muted">{hint}</p>
      ) : null}
      <div className="settings-dev-group-body">{children}</div>
    </section>
  );
}

function SettingsDevNumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onApply,
}: {
  id: string;
  label: string;
  value: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="settings-dev-field">
      <label className="settings-dev-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="settings-dev-field-row">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          className="settings-dev-field-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="settings-dev-apply-btn"
          onClick={onApply}
        >
          適用
        </button>
      </div>
    </div>
  );
}

function SettingsDevTogglePair({
  label,
  onUnlockAll,
  onClear,
}: {
  label: string;
  onUnlockAll: () => void;
  onClear: () => void;
}) {
  return (
    <div className="settings-dev-toggle-pair">
      <span className="settings-dev-field-label">{label}</span>
      <div className="settings-dev-button-row">
        <button
          type="button"
          className="settings-dev-apply-btn"
          onClick={onUnlockAll}
        >
          全解放
        </button>
        <button
          type="button"
          className="settings-dev-apply-btn"
          onClick={onClear}
        >
          未解放
        </button>
      </div>
    </div>
  );
}

function SettingsDevNotices({ messages }: { messages: (string | null)[] }) {
  const visible = messages.filter(
    (message): message is string =>
      message != null && message.trim().length > 0,
  );
  if (visible.length === 0) return null;

  return (
    <div className="settings-dev-notices">
      {visible.map((message, index) => (
        <p key={index} className="settings-dev-notice" role="status">
          {message}
        </p>
      ))}
    </div>
  );
}

function applyAuthActionResult(
  result: AuthActionResult,
  onSuccess: (message: string) => void,
  onFailure: (message: string) => void,
): void {
  if (result.ok === true) {
    onSuccess(result.message);
    return;
  }
  onFailure(result.error);
}

function AccountSection({
  username,
  onUsernameChange,
  onCloudSyncNow,
}: {
  username: string;
  onUsernameChange: (username: string) => void;
  onCloudSyncNow?: () => Promise<string>;
}) {
  const configured = isSupabaseConfigured();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState(username);
  const [usernameNotice, setUsernameNotice] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingOtp, setPendingOtp] = useState<{
    email: string;
    purpose: EmailAuthPurpose;
  } | null>(null);
  const [mailExpanded, setMailExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsernameInput(username);
  }, [username]);

  const [deviceLinkedEmail, setDeviceLinkedEmail] = useState<string | null>(() =>
    getDeviceLinkedEmail(),
  );

  useEffect(
    () =>
      subscribeAuthState((user) => {
        setAuthUser(user);
        syncDeviceLinkedEmailFromUser(user);
        setDeviceLinkedEmail(getDeviceLinkedEmail());
      }),
    [],
  );

  const linked = isEmailLinkedUser(authUser);
  const email = resolveAccountEmail(authUser);
  const boundEmail = email ?? deviceLinkedEmail;

  useEffect(() => {
    if (linked) {
      setPendingOtp(null);
      setOtpInput('');
    }
  }, [linked]);

  const mailStatusLabel = !configured
    ? '利用不可'
    : linked
      ? '連携済み'
      : deviceLinkedEmail != null
        ? '要ログイン'
        : '未連携';

  const refreshDeviceLinkedEmail = () => {
    setDeviceLinkedEmail(getDeviceLinkedEmail());
  };

  const runSendOtp = async (purpose: EmailAuthPurpose) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      let result =
        purpose === 'link'
          ? await linkEmailToCurrentUser(emailInput)
          : await signInWithEmailMagicLink(emailInput);
      let resolvedPurpose = purpose;

      // 以前 Safari 等で認証だけ完了している場合、連携ではなくログインへ切り替える
      if (
        purpose === 'link' &&
        result.ok === false &&
        result.reason === 'email_already_registered'
      ) {
        const loginResult = await signInWithEmailMagicLink(emailInput);
        if (loginResult.ok === true) {
          result = {
            ok: true,
            message:
              'このメールは既に認証登録済みです（連携解除してもクラウド上には残ります）。ログイン用の確認コードを送信しました。下の欄に入力してください。',
          };
          resolvedPurpose = 'login';
        } else {
          result = loginResult;
        }
      }

      if (result.ok === true) {
        setPendingOtp({
          email: normalizeEmailInput(emailInput),
          purpose: resolvedPurpose,
        });
        setOtpInput('');
        setNotice(result.message);
        refreshDeviceLinkedEmail();
        return;
      }
      setError(result.error);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : '処理に失敗しました';
      setError(
        message.toLowerCase().includes('rate limit')
          ? 'メールの送信回数上限に達しました。数分〜1時間ほど待ってから、もう一度お試しください。'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const runVerifyOtp = async () => {
    if (!pendingOtp) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await verifyEmailOtp(
        pendingOtp.email,
        otpInput,
        pendingOtp.purpose,
      );
      if (result.ok === true) {
        setPendingOtp(null);
        setOtpInput('');
        setNotice(result.message);
        refreshDeviceLinkedEmail();
        return;
      }
      setError(result.error);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '確認に失敗しました',
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (deviceLinkedEmail) {
      setEmailInput(deviceLinkedEmail);
    }
  }, [deviceLinkedEmail]);

  const handleUsernameSave = () => {
    setUsernameNotice(null);
    setUsernameError(null);
    const validationError = validateUsername(usernameInput);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }
    const next = usernameInput.trim();
    if (next === username) {
      setUsernameNotice('変更はありません');
      return;
    }
    onUsernameChange(next);
    setUsernameNotice('ユーザー名を変更しました');
  };

  return (
    <SettingsSection title="アカウント" compact>
      <div className="settings-account-form">
        <label className="settings-account-label" htmlFor="settings-username">
          ユーザー名（{USERNAME_MAX_LENGTH}文字以内）
        </label>
        <div className="settings-account-username-row">
          <input
            id="settings-username"
            type="text"
            className="settings-account-input"
            autoComplete="username"
            maxLength={USERNAME_MAX_LENGTH}
            value={usernameInput}
            disabled={busy}
            onChange={(event) => {
              setUsernameInput(event.target.value);
              if (usernameError) setUsernameError(null);
              if (usernameNotice) setUsernameNotice(null);
            }}
          />
          <button
            type="button"
            className="settings-account-btn settings-account-btn--primary"
            disabled={busy || usernameInput.trim().length === 0}
            onClick={handleUsernameSave}
          >
            変更
          </button>
        </div>
        {usernameNotice && (
          <p className="settings-account-notice" role="status">
            {usernameNotice}
          </p>
        )}
        {usernameError && (
          <p className="settings-account-error" role="alert">
            {usernameError}
          </p>
        )}
      </div>

      <div className="settings-account-mail">
        <button
          type="button"
          className={`settings-account-mail-toggle${mailExpanded ? ' is-open' : ''}`}
          aria-expanded={mailExpanded}
          onClick={() => setMailExpanded((open) => !open)}
        >
          <span className="settings-account-mail-toggle-title">メール連携</span>
          <span className="settings-account-mail-toggle-status">
            {mailStatusLabel}
          </span>
          <span className="settings-account-mail-toggle-chevron" aria-hidden>
            {mailExpanded ? '▲' : '▼'}
          </span>
        </button>

        {mailExpanded && (
          <div className="settings-account-mail-body">
            {!configured ? (
              <p className="settings-section-note muted">
                Supabase が未設定のため、アカウント連携は利用できません。
              </p>
            ) : (
              <p className="settings-section-note muted">
                メール連携すると、機種変更やホーム画面からの削除後もクラウドから進行を復元できます。連携中は自動でクラウドに保存されます。確認はメール内の数字コードをこの画面に入力します（ホーム画面アプリではリンクを開かないでください）。この端末で一度連携したメールは、解除するまで変更できません。
              </p>
            )}
            {configured && (
              <>
                {linked ? (
                  <>
                    {boundEmail != null && (
                      <p className="settings-section-note muted">{boundEmail}</p>
                    )}
                    <div className="settings-account-actions">
                      {onCloudSyncNow && (
                        <button
                          type="button"
                          className="settings-account-btn settings-account-btn--primary"
                          disabled={busy}
                          onClick={() => {
                            void (async () => {
                              setBusy(true);
                              setNotice(null);
                              setError(null);
                              try {
                                const message = await onCloudSyncNow();
                                setNotice(message);
                              } catch (caught) {
                                setError(
                                  caught instanceof Error
                                    ? caught.message
                                    : '同期に失敗しました',
                                );
                              } finally {
                                setBusy(false);
                              }
                            })();
                          }}
                        >
                          今すぐ同期
                        </button>
                      )}
                      <button
                        type="button"
                        className="settings-account-btn"
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            setNotice(null);
                            setError(null);
                            try {
                              const result = await signOutAccount();
                              applyAuthActionResult(result, setNotice, setError);
                              refreshDeviceLinkedEmail();
                            } catch (caught) {
                              setError(
                                caught instanceof Error
                                  ? caught.message
                                  : 'ログアウトに失敗しました',
                              );
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        ログアウト
                      </button>
                      <button
                        type="button"
                        className="settings-account-btn"
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            setNotice(null);
                            setError(null);
                            try {
                              const result = await unlinkAccountFromDevice();
                              applyAuthActionResult(result, setNotice, setError);
                              refreshDeviceLinkedEmail();
                              if (result.ok) setEmailInput('');
                            } catch (caught) {
                              setError(
                                caught instanceof Error
                                  ? caught.message
                                  : '連携解除に失敗しました',
                              );
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        連携を解除
                      </button>
                    </div>
                    <p className="settings-section-note muted">
                      「連携を解除」は端末の表示を外すだけで、クラウド上の認証アカウントは残ります。同じメールで再び使うときは「ログイン（復元用）」です。別のメールにする場合も、先に解除してから新しいメールで連携してください。
                    </p>
                  </>
                ) : pendingOtp ? (
                  <div className="settings-account-form">
                    <p className="settings-section-note muted">
                      {pendingOtp.email}{' '}
                      宛に確認コードを送りました。メールに記載の数字を入力してください。ホーム画面アプリではメール内のリンクを開かず、ここでコードを入力してください。
                    </p>
                    <label
                      className="settings-account-label"
                      htmlFor="settings-account-otp"
                    >
                      確認コード
                    </label>
                    <input
                      id="settings-account-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="settings-account-input"
                      placeholder="12345678"
                      value={otpInput}
                      disabled={busy}
                      onChange={(event) => {
                        setOtpInput(event.target.value);
                        if (error) setError(null);
                      }}
                    />
                    <div className="settings-account-actions">
                      <button
                        type="button"
                        className="settings-account-btn settings-account-btn--primary"
                        disabled={busy || otpInput.trim().length === 0}
                        onClick={() => {
                          void runVerifyOtp();
                        }}
                      >
                        コードを確認
                      </button>
                      <button
                        type="button"
                        className="settings-account-btn"
                        disabled={busy}
                        onClick={() => {
                          void runSendOtp(pendingOtp.purpose);
                        }}
                      >
                        コードを再送
                      </button>
                      <button
                        type="button"
                        className="settings-account-btn"
                        disabled={busy}
                        onClick={() => {
                          setPendingOtp(null);
                          setOtpInput('');
                          setNotice(null);
                          setError(null);
                        }}
                      >
                        戻る
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="settings-account-form">
                    {deviceLinkedEmail != null ? (
                      <p className="settings-section-note muted">
                        この端末は {deviceLinkedEmail}{' '}
                        の連携記録があります。同じメールで使う場合は「ログイン（復元用）」を押してください。「この端末を連携」は未登録メール用です。別メールにする場合は「連携を解除」後に新しいメールで連携してください。
                      </p>
                    ) : (
                      <p className="settings-section-note muted">
                        ボタンを押すと確認コード付きメール（英語の場合あり）が届きます。届いた数字をこの画面に入力してください。ホーム画面アプリではメール内のリンクは開かないでください。届かないときは迷惑メールフォルダも確認してください。短時間に何度も送ると送信制限にかかることがあります。
                      </p>
                    )}
                    <label
                      className="settings-account-label"
                      htmlFor="settings-account-email"
                    >
                      メールアドレス
                    </label>
                    <input
                      id="settings-account-email"
                      type="email"
                      className="settings-account-input"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      disabled={busy || deviceLinkedEmail != null}
                      readOnly={deviceLinkedEmail != null}
                      onChange={(event) => setEmailInput(event.target.value)}
                    />
                    <div className="settings-account-actions">
                      {deviceLinkedEmail == null && (
                        <button
                          type="button"
                          className="settings-account-btn settings-account-btn--primary"
                          disabled={busy || emailInput.trim().length === 0}
                          onClick={() => {
                            void runSendOtp('link');
                          }}
                        >
                          この端末を連携
                        </button>
                      )}
                      <button
                        type="button"
                        className="settings-account-btn settings-account-btn--primary"
                        disabled={busy || emailInput.trim().length === 0}
                        onClick={() => {
                          void runSendOtp('login');
                        }}
                      >
                        ログイン（復元用）
                      </button>
                      {deviceLinkedEmail != null && (
                        <button
                          type="button"
                          className="settings-account-btn"
                          disabled={busy}
                          onClick={() => {
                            void (async () => {
                              setBusy(true);
                              setNotice(null);
                              setError(null);
                              try {
                                const result = await unlinkAccountFromDevice();
                                applyAuthActionResult(
                                  result,
                                  setNotice,
                                  setError,
                                );
                                refreshDeviceLinkedEmail();
                                if (result.ok) setEmailInput('');
                              } catch (caught) {
                                setError(
                                  caught instanceof Error
                                    ? caught.message
                                    : '連携解除に失敗しました',
                                );
                              } finally {
                                setBusy(false);
                              }
                            })();
                          }}
                        >
                          連携を解除
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {notice && (
                  <p className="settings-account-notice" role="status">
                    {notice}
                  </p>
                )}
                {error && (
                  <p className="settings-account-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

export function SettingsScreen({
  user,
  unlockedDeckCount,
  freePixels,
  jewels,
  attributeShardsCount,
  universalShardCount,
  talismanCount,
  subscriptionLabel,
  mockLifetimeSpendYen = 0,
  mockAdsWatchedTotal = 0,
  soundEnabled,
  onSoundEnabledChange,
  onBack,
  devCardOptions,
  devDeckFillOptions,
  onDevSetLevel,
  onDevSetUnlockedDeckCount,
  memoryAlbumUnlockedRows,
  onDevSetMemoryAlbumExpansionRows,
  onDevSetFreePixels,
  onDevSetJewels,
  onDevSetSubscription,
  onDevSetAttributeShards,
  onDevSetUniversalShards,
  onDevSetTalisman,
  onDevMarkCardLost,
  onDevFillDeckSlots,
  onDevUnlockAllPaletteColors,
  onDevClearPaletteShopUnlocks,
  onDevUnlockAllEditorTools,
  onDevClearEditorShopUnlocks,
  onCloudSyncNow,
  onUsernameChange,
}: SettingsScreenProps) {
  const [devLevelInput, setDevLevelInput] = useState(
    () => String(user?.level ?? 1),
  );
  const [devDeckUnlockInput, setDevDeckUnlockInput] = useState(
    () => String(unlockedDeckCount || DECK_SLOT_INITIAL_UNLOCKED),
  );
  const [devAlbumExpansionInput, setDevAlbumExpansionInput] = useState(() =>
    String(
      Math.max(0, memoryAlbumUnlockedRows - MEMORY_ALBUM_INITIAL_ROWS),
    ),
  );
  const [devFreePixelsInput, setDevFreePixelsInput] = useState(
    () => String(freePixels),
  );
  const [devJewelsInput, setDevJewelsInput] = useState(() => String(jewels));
  const [devAttributeShardsInput, setDevAttributeShardsInput] = useState(
    () => String(attributeShardsCount),
  );
  const [devUniversalShardsInput, setDevUniversalShardsInput] = useState(
    () => String(universalShardCount),
  );
  const [devTalismanInput, setDevTalismanInput] = useState(
    () => String(talismanCount),
  );
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [devDeckNotice, setDevDeckNotice] = useState<string | null>(null);
  const [devAlbumNotice, setDevAlbumNotice] = useState<string | null>(null);
  const [devPixelsNotice, setDevPixelsNotice] = useState<string | null>(null);
  const [devJewelsNotice, setDevJewelsNotice] = useState<string | null>(null);
  const [devSubscriptionNotice, setDevSubscriptionNotice] = useState<
    string | null
  >(null);
  const [devLostNotice, setDevLostNotice] = useState<string | null>(null);
  const [devFillNotice, setDevFillNotice] = useState<string | null>(null);
  const [devPaletteNotice, setDevPaletteNotice] = useState<string | null>(null);
  const [devEditorNotice, setDevEditorNotice] = useState<string | null>(null);
  const [devShardsNotice, setDevShardsNotice] = useState<string | null>(null);
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
    setDevJewelsInput(String(jewels));
  }, [jewels]);

  useEffect(() => {
    setDevAttributeShardsInput(String(attributeShardsCount));
  }, [attributeShardsCount]);

  useEffect(() => {
    setDevUniversalShardsInput(String(universalShardCount));
  }, [universalShardCount]);

  useEffect(() => {
    setDevTalismanInput(String(talismanCount));
  }, [talismanCount]);

  useEffect(() => {
    setDevDeckUnlockInput(String(unlockedDeckCount));
  }, [unlockedDeckCount]);

  useEffect(() => {
    setDevAlbumExpansionInput(
      String(Math.max(0, memoryAlbumUnlockedRows - MEMORY_ALBUM_INITIAL_ROWS)),
    );
  }, [memoryAlbumUnlockedRows]);

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
    setDevNotice(onDevSetLevel(parsed));
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

  const handleDevAlbumExpansionApply = () => {
    const parsed = Number.parseInt(devAlbumExpansionInput, 10);
    if (
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > MEMORY_ALBUM_MAX_EXPANSION_ROWS
    ) {
      setDevAlbumNotice(
        `アルバム拡張の解放数は 0〜${MEMORY_ALBUM_MAX_EXPANSION_ROWS} の整数を入力してください。`,
      );
      return;
    }
    onDevSetMemoryAlbumExpansionRows(parsed);
    setDevAlbumExpansionInput(String(parsed));
    const totalRows = MEMORY_ALBUM_INITIAL_ROWS + parsed;
    setDevAlbumNotice(
      `アルバム拡張を ${parsed} 行解放しました（保存上限 ${getMemoryAlbumCapacity(totalRows)} 枚）。`,
    );
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

  const handleDevJewelsApply = () => {
    const parsed = Number.parseInt(devJewelsInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDevJewelsNotice('ジュエルは 0 以上の整数を入力してください。');
      return;
    }
    onDevSetJewels(parsed);
    setDevJewelsNotice(`ジュエルを ${parsed.toLocaleString()} に変更しました。`);
  };

  const handleDevSubscriptionSet = (plan: SubscriptionPlan) => {
    setDevSubscriptionNotice(onDevSetSubscription(plan));
  };

  const handleDevAttributeShardsApply = () => {
    const parsed = Number.parseInt(devAttributeShardsInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDevShardsNotice('属性かけらは 0 以上の整数を入力してください。');
      return;
    }
    setDevShardsNotice(onDevSetAttributeShards(parsed));
  };

  const handleDevUniversalShardsApply = () => {
    const parsed = Number.parseInt(devUniversalShardsInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDevShardsNotice('汎用かけらは 0 以上の整数を入力してください。');
      return;
    }
    setDevShardsNotice(onDevSetUniversalShards(parsed));
  };

  const handleDevTalismanApply = () => {
    const parsed = Number.parseInt(devTalismanInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDevShardsNotice('護符は 0 以上の整数を入力してください。');
      return;
    }
    setDevShardsNotice(onDevSetTalisman(parsed));
  };

  const handleDevMarkCardLost = () => {
    setDevLostNotice(onDevMarkCardLost(devLostCardId));
  };

  const handleDevFillDeckSlots = () => {
    setDevFillNotice(onDevFillDeckSlots(devFillDeckIndex));
  };

  const handleDevUnlockAllPaletteColors = () => {
    setDevPaletteNotice(onDevUnlockAllPaletteColors());
  };

  const handleDevClearPaletteShopUnlocks = () => {
    setDevPaletteNotice(onDevClearPaletteShopUnlocks());
  };

  const handleDevUnlockAllEditorTools = () => {
    setDevEditorNotice(onDevUnlockAllEditorTools());
  };

  const handleDevClearEditorShopUnlocks = () => {
    setDevEditorNotice(onDevClearEditorShopUnlocks());
  };

  const selectedDevCard = devCardOptions.find((option) => option.id === devLostCardId);
  const selectedDevFillDeck = devDeckFillOptions.find(
    (option) => option.index === devFillDeckIndex,
  );

  return (
    <section className="screen screen-settings">
      {onBack && (
        <header className="settings-top-bar">
          <button
            type="button"
            className="settings-back-btn"
            onClick={onBack}
          >
            戻る
          </button>
          <h1 className="settings-top-title">設定</h1>
        </header>
      )}
      <div className="settings-scroll">
        <AccountSection
          username={user.username}
          onUsernameChange={onUsernameChange}
          onCloudSyncNow={onCloudSyncNow}
        />

        <SettingsSection title="戦績" compact>
          <SettingsRow label="レベル" value={`Lv.${user.level}`} />
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
          <SettingsRow
            label="CPU戦"
            value={`${user.cpuBattleWins}勝 ${user.cpuBattleLosses}敗`}
          />
          <SettingsRow
            label="対人戦（オフライン）"
            value={`${user.offlinePvpBattleWins}勝 ${user.offlinePvpBattleLosses}敗`}
          />
        </SettingsSection>

        <SettingsSection title="サブスク・課金" compact>
          <SettingsRow label="サブスク" value={subscriptionLabel} />
          <SettingsRow
            label="課金額累計（テスト）"
            value={`${mockLifetimeSpendYen.toLocaleString()}円`}
          />
          <SettingsRow
            label="広告視聴回数（テスト）"
            value={`${mockAdsWatchedTotal.toLocaleString()}回`}
          />
        </SettingsSection>

        {isDev && (
          <SettingsSection title="開発">
            <div className="settings-dev-groups">
              <SettingsDevGroup title="ヘッダーの設定">
                <div className="settings-dev-grid settings-dev-grid--triple">
                  <SettingsDevNumberField
                    id="settings-dev-level"
                    label="レベル"
                    min={1}
                    max={MAX_USER_LEVEL}
                    value={devLevelInput}
                    onChange={setDevLevelInput}
                    onApply={handleDevApply}
                  />
                  <SettingsDevNumberField
                    id="settings-dev-free-pixels"
                    label="pxコイン"
                    min={0}
                    value={devFreePixelsInput}
                    onChange={setDevFreePixelsInput}
                    onApply={handleDevFreePixelsApply}
                  />
                  <SettingsDevNumberField
                    id="settings-dev-jewels"
                    label="ジュエル"
                    min={0}
                    value={devJewelsInput}
                    onChange={setDevJewelsInput}
                    onApply={handleDevJewelsApply}
                  />
                </div>
              </SettingsDevGroup>

              <SettingsDevGroup title="スロット解放">
                <div className="settings-dev-grid">
                  <SettingsDevNumberField
                    id="settings-dev-deck-unlock"
                    label="デッキ数"
                    min={1}
                    max={DECK_SLOT_COUNT}
                    value={devDeckUnlockInput}
                    onChange={setDevDeckUnlockInput}
                    onApply={handleDevDeckUnlockApply}
                  />
                  <SettingsDevNumberField
                    id="settings-dev-album-expansion"
                    label="アルバム拡張"
                    min={0}
                    max={MEMORY_ALBUM_MAX_EXPANSION_ROWS}
                    value={devAlbumExpansionInput}
                    onChange={setDevAlbumExpansionInput}
                    onApply={handleDevAlbumExpansionApply}
                  />
                </div>
              </SettingsDevGroup>

              <SettingsDevGroup title="サブスク（モック）">
                <div className="settings-dev-button-row">
                  <button
                    type="button"
                    className="settings-dev-apply-btn settings-dev-apply-btn--wide"
                    onClick={() => handleDevSubscriptionSet('none')}
                  >
                    未加入
                  </button>
                  <button
                    type="button"
                    className="settings-dev-apply-btn settings-dev-apply-btn--wide"
                    onClick={() => handleDevSubscriptionSet('light')}
                  >
                    ライト
                  </button>
                  <button
                    type="button"
                    className="settings-dev-apply-btn settings-dev-apply-btn--wide"
                    onClick={() => handleDevSubscriptionSet('premium')}
                  >
                    プレミアム
                  </button>
                </div>
              </SettingsDevGroup>

              <SettingsDevGroup title="所持アイテム">
                <div className="settings-dev-grid settings-dev-grid--triple">
                  <SettingsDevNumberField
                    id="settings-dev-attribute-shards"
                    label="属性かけら"
                    min={0}
                    value={devAttributeShardsInput}
                    onChange={setDevAttributeShardsInput}
                    onApply={handleDevAttributeShardsApply}
                  />
                  <SettingsDevNumberField
                    id="settings-dev-universal-shards"
                    label="汎用かけら"
                    min={0}
                    value={devUniversalShardsInput}
                    onChange={setDevUniversalShardsInput}
                    onApply={handleDevUniversalShardsApply}
                  />
                  <SettingsDevNumberField
                    id="settings-dev-talisman"
                    label="護符"
                    min={0}
                    value={devTalismanInput}
                    onChange={setDevTalismanInput}
                    onApply={handleDevTalismanApply}
                  />
                </div>
              </SettingsDevGroup>

              <SettingsDevGroup title="お絵描き">
                <div className="settings-dev-drawing-row">
                  <SettingsDevTogglePair
                    label="色パレット"
                    onUnlockAll={handleDevUnlockAllPaletteColors}
                    onClear={handleDevClearPaletteShopUnlocks}
                  />
                  <SettingsDevTogglePair
                    label="お絵描きツール"
                    onUnlockAll={handleDevUnlockAllEditorTools}
                    onClear={handleDevClearEditorShopUnlocks}
                  />
                </div>
              </SettingsDevGroup>

              <SettingsDevGroup title="カード操作">
                <div className="settings-dev-stack settings-dev-card-actions">
                  <div className="settings-dev-block">
                    <label
                      className="settings-dev-field-label"
                      htmlFor="settings-dev-fill-deck"
                    >
                      デッキ自動生成（空きスロット）
                    </label>
                    <div className="settings-dev-field-row">
                      <select
                        id="settings-dev-fill-deck"
                        className="settings-dev-field-input settings-dev-field-select"
                        value={String(devFillDeckIndex)}
                        onChange={(event) =>
                          setDevFillDeckIndex(
                            Number.parseInt(event.target.value, 10),
                          )
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
                        className="settings-dev-apply-btn"
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

                  <div className="settings-dev-block">
                    <label
                      className="settings-dev-field-label"
                      htmlFor="settings-dev-lost-card"
                    >
                      Lost 化するカード
                    </label>
                    <div className="settings-dev-field-row">
                      <select
                        id="settings-dev-lost-card"
                        className="settings-dev-field-input settings-dev-field-select"
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
                        className="settings-dev-apply-btn"
                        disabled={!selectedDevCard || selectedDevCard.isLost}
                        onClick={handleDevMarkCardLost}
                      >
                        Lost にする
                      </button>
                    </div>
                  </div>
                </div>
              </SettingsDevGroup>
            </div>

            <SettingsDevNotices
              messages={[
                devNotice,
                devDeckNotice,
                devAlbumNotice,
                devPixelsNotice,
                devJewelsNotice,
                devSubscriptionNotice,
                devShardsNotice,
                devLostNotice,
                devFillNotice,
                devPaletteNotice,
                devEditorNotice,
              ]}
            />
          </SettingsSection>
        )}

        <SettingsSection title="その他">
          <SettingsToggleRow
            label="BGM"
            checked={soundEnabled}
            onChange={onSoundEnabledChange}
          />
          {FUTURE_ROWS.map((row) => (
            <SettingsRow key={row.label} label={row.label} hint={row.hint} />
          ))}
        </SettingsSection>
      </div>
    </section>
  );
}
