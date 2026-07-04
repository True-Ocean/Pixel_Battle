import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { ensureAnonymousUserId } from './anonymous';
import {
  assertEmailAllowedOnDevice,
  clearDeviceLinkedEmail,
  rememberDeviceLinkedEmail,
} from './deviceLinkedEmail';
import {
  getAuthUser,
  isEmailLinkedUser,
  resolveAccountEmail,
} from './session';
import type { AuthActionResult } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Supabase 既定の最小長に合わせる */
export const MIN_PASSWORD_LENGTH = 6;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmailInput(email));
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

function isEmailAlreadyRegisteredMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already registered') ||
    lower.includes('email address is already') ||
    lower.includes('already exists')
  );
}

function isInvalidCredentialsMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password')
  );
}

/** Supabase のエラー文言をユーザー向けメッセージに変換する */
export function formatAuthError(message: string): AuthActionResult {
  const text = message.trim() || '認証に失敗しました';
  const lower = text.toLowerCase();
  if (
    lower.includes('rate limit') ||
    lower.includes('email rate limit') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return {
      ok: false,
      reason: 'rate_limited',
      error:
        'メールの送信回数上限に達しました。数分〜1時間ほど待ってから、もう一度お試しください。',
    };
  }
  if (isEmailAlreadyRegisteredMessage(text)) {
    return {
      ok: false,
      reason: 'email_already_registered',
      error:
        'このメールは登録済みです。「ログイン（復元用）」を使ってください。',
    };
  }
  if (isInvalidCredentialsMessage(text)) {
    return {
      ok: false,
      reason: 'invalid_credentials',
      error: 'メールアドレスまたはパスワードが正しくありません。',
    };
  }
  return {
    ok: false,
    reason: 'auth_error',
    error: text,
  };
}

function authErrorResult(error: { message?: string } | null | undefined): AuthActionResult {
  return formatAuthError(error?.message?.trim() || '認証に失敗しました');
}

function passwordValidationError(password: string): AuthActionResult | null {
  if (!isValidPassword(password)) {
    return {
      ok: false,
      reason: 'invalid_password',
      error: `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上にしてください`,
    };
  }
  return null;
}

/**
 * 失敗時に匿名セッションを戻す（公開デッキ等のため）。
 * 端末のセーブは localStorage に残る。
 */
async function restoreAnonymousSession(): Promise<void> {
  await ensureAnonymousUserId();
}

/**
 * メール＋パスワードでこの端末を連携する（新規登録）。
 * 無料枠ではメールテンプレートを編集できず OTP が使えないため、パスワード認証を使う。
 * Confirm email が ON だとセッションが返らず完了できない（ダッシュボードで OFF が必須）。
 *
 * 確認後の auth user_id はメールユーザー側。端末セーブは localStorage に残り、同期でクラウドへ上がる。
 */
export async function linkEmailToCurrentUser(
  emailInput: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }
  if (!isValidEmail(emailInput)) {
    return {
      ok: false,
      reason: 'invalid_email',
      error: 'メールアドレスの形式が正しくありません',
    };
  }
  const passwordError = passwordValidationError(password);
  if (passwordError) return passwordError;

  const allowed = assertEmailAllowedOnDevice(emailInput);
  if (!allowed.ok) {
    return {
      ok: false,
      reason: 'device_email_locked',
      error: allowed.error,
    };
  }
  const email = allowed.email;

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }

  const user = await getAuthUser();
  if (isEmailLinkedUser(user)) {
    const linkedEmail = resolveAccountEmail(user);
    if (linkedEmail) rememberDeviceLinkedEmail(linkedEmail);
    return {
      ok: false,
      reason: 'already_linked',
      error: `すでに ${linkedEmail} と連携済みです`,
    };
  }

  // 匿名セッションがあると signUp が競合しうるので一度外す（localStorage セーブは残る）
  await client.auth.signOut();

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    await restoreAnonymousSession();
    if (isEmailAlreadyRegisteredMessage(error.message ?? '')) {
      // 同じパスワードならログインへフォールバック
      const login = await signInWithEmailPassword(email, password);
      if (login.ok) {
        return {
          ok: true,
          message: '登録済みのアカウントでログインしました',
        };
      }
      return {
        ok: false,
        reason: 'email_already_registered',
        error:
          'このメールは登録済みです。「ログイン（復元用）」でパスワードを入力してください。',
      };
    }
    return authErrorResult(error);
  }

  if (!data.session) {
    await restoreAnonymousSession();
    return {
      ok: false,
      reason: 'email_confirmation_required',
      error:
        'メール確認が有効なため連携を完了できません。Supabase の Authentication → Providers → Email で「Confirm email」を OFF にしてください（無料枠では必須）。',
    };
  }

  const linkedUser = data.user ?? (await getAuthUser());
  syncDeviceLinkedEmailFromUser(linkedUser);
  return {
    ok: true,
    message: 'メールアドレス連携が完了しました',
  };
}

/**
 * メール＋パスワードでログインする（別端末からの復元用）。
 * 匿名セッションがある場合は置き換わる。端末セーブは localStorage に残る。
 */
export async function signInWithEmailPassword(
  emailInput: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }
  if (!isValidEmail(emailInput)) {
    return {
      ok: false,
      reason: 'invalid_email',
      error: 'メールアドレスの形式が正しくありません',
    };
  }
  const passwordError = passwordValidationError(password);
  if (passwordError) return passwordError;

  const allowed = assertEmailAllowedOnDevice(emailInput);
  if (!allowed.ok) {
    return {
      ok: false,
      reason: 'device_email_locked',
      error: allowed.error,
    };
  }
  const email = allowed.email;

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }

  await client.auth.signOut();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await restoreAnonymousSession();
    return authErrorResult(error);
  }

  const linkedUser = data.user ?? (await getAuthUser());
  syncDeviceLinkedEmailFromUser(linkedUser);
  return {
    ok: true,
    message: 'ログインしました',
  };
}

/** ログアウト（端末のセーブデータ・端末の連携メール記録は消えない） */
export async function signOutAccount(): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }

  const { error } = await client.auth.signOut();
  if (error) return authErrorResult(error);
  await restoreAnonymousSession();

  return {
    ok: true,
    message: 'ログアウトしました。この端末のデータはそのまま残ります。',
  };
}

const UNLINK_SUCCESS_MESSAGE =
  '連携を解除しました。同じメールで使う場合は「ログイン（復元用）」を押してください。';

/**
 * この端末のメールアドレス連携表示を解除する（ログアウト＋端末側の連携記録を削除）。
 * クラウド上の auth.users / player_saves は削除しない。
 * 同じメールを再度使うには「ログイン（復元用）」が必要。
 */
export async function unlinkAccountFromDevice(): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  clearDeviceLinkedEmail();

  if (!isSupabaseConfigured() || !client) {
    return {
      ok: true,
      message: UNLINK_SUCCESS_MESSAGE,
    };
  }

  const { error } = await client.auth.signOut();
  await restoreAnonymousSession();
  if (error) {
    return {
      ok: true,
      message: `${UNLINK_SUCCESS_MESSAGE}（ログアウト処理で問題がありましたが、端末の連携記録は削除済みです。必要ならアプリを再読み込みしてください。）`,
    };
  }
  return {
    ok: true,
    message: UNLINK_SUCCESS_MESSAGE,
  };
}

/** セッションが連携済みなら端末にメールを記録する */
export function syncDeviceLinkedEmailFromUser(
  user: Parameters<typeof isEmailLinkedUser>[0],
): void {
  if (!isEmailLinkedUser(user)) return;
  const email = resolveAccountEmail(user);
  if (email) rememberDeviceLinkedEmail(email);
}

export function describeAuthUser(
  user: Parameters<typeof isEmailLinkedUser>[0],
): string {
  if (!user) return '未ログイン';
  if (!isEmailLinkedUser(user)) return '端末のみ（未連携）';
  const email = resolveAccountEmail(user);
  return email ?? '連携済み';
}
