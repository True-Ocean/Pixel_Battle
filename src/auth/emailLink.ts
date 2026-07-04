import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { ensureAnonymousUserId } from './anonymous';
import { getAuthRedirectUrl } from './redirectUrl';
import {
  getAuthUser,
  isAnonymousUser,
  isEmailLinkedUser,
  resolveAccountEmail,
} from './session';
import type { AuthActionResult } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmailInput(email));
}

/**
 * 現在のセッション（無ければ匿名を作成）にメールを紐づける。
 * user_id は維持され、確認用マジックリンクが送られる。
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
  const email = normalizeEmailInput(emailInput);
  if (!isValidEmail(email)) {
    return {
      ok: false,
      reason: 'invalid_email',
      error: 'メールアドレスの形式が正しくありません',
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
    return {
      ok: false,
      reason: 'already_linked',
      error: `すでに ${resolveAccountEmail(user)} と連携済みです`,
    };
  }

  const { error } = await client.auth.updateUser(
    { email },
    { emailRedirectTo: getAuthRedirectUrl() },
  );
  if (error) {
    return {
      ok: false,
      reason: 'auth_error',
      error: error.message,
    };
  }

  return {
    ok: true,
    message:
      '確認メールを送信しました（差出人は Supabase で、英語の場合があります）。メール内のリンクを開くと、この端末の進行がアカウントに紐づきます。届かないときは迷惑メールフォルダも確認してください。',
  };
}

/**
 * メールマジックリンクでログインする（別端末からの復元用）。
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
  const email = normalizeEmailInput(emailInput);
  if (!isValidEmail(email)) {
    return {
      ok: false,
      reason: 'invalid_email',
      error: 'メールアドレスの形式が正しくありません',
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

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      shouldCreateUser: false,
    },
  });
  if (error) {
    return {
      ok: false,
      reason: 'auth_error',
      error: error.message,
    };
  }

  return {
    ok: true,
    message:
      'ログイン用のメールを送信しました（差出人は Supabase で、英語の場合があります）。メール内のリンクを開くとログインします。届かないときは迷惑メールフォルダも確認してください。',
  };
}

/** ログアウト（端末のセーブデータは消えない） */
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
  if (error) {
    return {
      ok: false,
      reason: 'auth_error',
      error: error.message,
    };
  }

  return {
    ok: true,
    message: 'ログアウトしました。この端末のデータはそのまま残ります。',
  };
}

export function describeAuthUser(user: Parameters<typeof isAnonymousUser>[0]): string {
  if (!user) return '未ログイン';
  if (isAnonymousUser(user)) return '端末のみ（未連携）';
  const email = resolveAccountEmail(user);
  return email ?? '連携済み';
}
