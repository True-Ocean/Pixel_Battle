import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { ensureAnonymousUserId } from './anonymous';
import {
  assertEmailAllowedOnDevice,
  clearDeviceLinkedEmail,
  rememberDeviceLinkedEmail,
} from './deviceLinkedEmail';
import { getAuthRedirectUrl } from './redirectUrl';
import {
  getAuthUser,
  isAnonymousUser,
  isEmailLinkedUser,
  resolveAccountEmail,
} from './session';
import type { AuthActionResult, EmailAuthPurpose } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmailInput(email));
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
  return {
    ok: false,
    reason: 'auth_error',
    error: text,
  };
}

function authErrorResult(error: { message?: string } | null | undefined): AuthActionResult {
  return formatAuthError(error?.message?.trim() || '認証に失敗しました');
}

const OTP_SENT_MESSAGE =
  '確認コードをメールで送信しました。下の欄にコードを入力してください（メール内のリンクは開かなくて大丈夫です）。';

/**
 * 現在のセッション（無ければ匿名を作成）にメールを紐づける準備。
 * user_id は維持され、確認コード付きメールが送られる。
 * 完了には verifyEmailOtp(..., 'link') が必要。
 */
export async function linkEmailToCurrentUser(
  emailInput: string,
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

  const userId = await ensureAnonymousUserId();
  if (!userId) {
    return {
      ok: false,
      reason: 'no_session',
      error: 'セッションを開始できませんでした',
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

  const { error } = await client.auth.updateUser(
    { email },
    { emailRedirectTo: getAuthRedirectUrl() },
  );
  if (error) return authErrorResult(error);

  return {
    ok: true,
    message: OTP_SENT_MESSAGE,
  };
}

/**
 * メール確認コードでログインする準備（別端末からの復元用）。
 * 完了には verifyEmailOtp(..., 'login') が必要。
 * 匿名セッションがある場合は置き換わる点に注意。
 */
export async function signInWithEmailMagicLink(
  emailInput: string,
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

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      shouldCreateUser: false,
    },
  });
  if (error) return authErrorResult(error);

  return {
    ok: true,
    message: OTP_SENT_MESSAGE,
  };
}

/**
 * メールに記載の確認コードを検証して連携／ログインを完了する。
 * ホーム画面 PWA 内で完結させるための入口（Safari を経由しない）。
 */
export async function verifyEmailOtp(
  emailInput: string,
  tokenInput: string,
  purpose: EmailAuthPurpose,
): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }

  const email = normalizeEmailInput(emailInput);
  const token = tokenInput.replace(/\s/g, '');
  if (!isValidEmail(email)) {
    return {
      ok: false,
      reason: 'invalid_email',
      error: 'メールアドレスの形式が正しくありません',
    };
  }
  if (!/^\d{6,8}$/.test(token)) {
    return {
      ok: false,
      reason: 'invalid_otp',
      error: '確認コードはメールに記載の数字です（通常6〜8桁）',
    };
  }

  const allowed = assertEmailAllowedOnDevice(email);
  if (!allowed.ok) {
    return {
      ok: false,
      reason: 'device_email_locked',
      error: allowed.error,
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

  const primaryType = purpose === 'link' ? 'email_change' : 'email';
  const fallbackTypes =
    purpose === 'link'
      ? (['email', 'magiclink'] as const)
      : (['magiclink', 'email_change'] as const);

  let lastError: { message?: string } | null = null;
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: primaryType,
  });
  if (error) {
    lastError = error;
    for (const type of fallbackTypes) {
      const retry = await client.auth.verifyOtp({ email, token, type });
      if (!retry.error) {
        const user = retry.data.user ?? (await getAuthUser());
        syncDeviceLinkedEmailFromUser(user);
        return {
          ok: true,
          message:
            purpose === 'link'
              ? 'メール連携が完了しました'
              : 'ログインしました',
        };
      }
      lastError = retry.error;
    }
    return authErrorResult(lastError);
  }

  const user = data.user ?? (await getAuthUser());
  syncDeviceLinkedEmailFromUser(user);
  return {
    ok: true,
    message:
      purpose === 'link' ? 'メール連携が完了しました' : 'ログインしました',
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

  return {
    ok: true,
    message: 'ログアウトしました。この端末のデータはそのまま残ります。',
  };
}

/**
 * この端末のメール連携を解除する（ログアウト＋端末側の連携記録を削除）。
 * クラウド上のアカウント自体は削除しない。
 */
export async function unlinkAccountFromDevice(): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client) {
    clearDeviceLinkedEmail();
    return {
      ok: true,
      message:
        'この端末の連携を解除しました。別のメールアドレスで改めて連携できます。',
    };
  }

  const { error } = await client.auth.signOut();
  if (error) return authErrorResult(error);
  clearDeviceLinkedEmail();
  return {
    ok: true,
    message:
      'この端末の連携を解除しました。別のメールアドレスで改めて連携できます。',
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

export function describeAuthUser(user: Parameters<typeof isAnonymousUser>[0]): string {
  if (!user) return '未ログイン';
  if (isAnonymousUser(user)) return '端末のみ（未連携）';
  const email = resolveAccountEmail(user);
  return email ?? '連携済み';
}
