import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { ensureAnonymousUserId } from './anonymous';
import { clearDeviceLinkedEmail } from './deviceLinkedEmail';
import {
  getAuthSession,
  getAuthUser,
  isEmailLinkedUser,
  resolveAccountEmail,
} from './session';
import type { AuthActionResult } from './types';
import { isValidPassword } from './emailLink';

function getFunctionsBaseUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url || url.includes('YOUR_PROJECT_REF')) return null;
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

/**
 * クラウドのアカウント（auth / player_saves / 公開デッキ）を削除する。
 * Edge Function `delete-account` のデプロイが必要。
 * 成功後は匿名セッションに戻し、端末の連携メール記録を消す。
 */
export async function deleteAccount(password: string): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません（.env を確認してください）',
    };
  }
  if (!isValidPassword(password)) {
    return {
      ok: false,
      reason: 'invalid_password',
      error: 'パスワードを入力してください（6 文字以上）',
    };
  }

  const user = await getAuthUser();
  if (!isEmailLinkedUser(user)) {
    return {
      ok: false,
      reason: 'not_linked',
      error: 'メールアドレス連携済みのアカウントのみ削除できます',
    };
  }
  const email = resolveAccountEmail(user);
  if (!email) {
    return {
      ok: false,
      reason: 'not_linked',
      error: 'メールアドレスを確認できませんでした',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase が設定されていません',
    };
  }

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return {
      ok: false,
      reason: 'invalid_credentials',
      error: 'パスワードが正しくありません',
    };
  }

  const session = await getAuthSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    return {
      ok: false,
      reason: 'no_session',
      error: 'セッションを取得できませんでした。もう一度お試しください',
    };
  }

  const functionsBase = getFunctionsBaseUrl();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!functionsBase) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Supabase の URL が設定されていません',
    };
  }

  let response: Response;
  try {
    response = await fetch(`${functionsBase}/delete-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return {
      ok: false,
      reason: 'delete_failed',
      error: 'アカウント削除に失敗しました。通信環境を確認してください',
    };
  }

  if (!response.ok) {
    let message = 'アカウント削除に失敗しました';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error?.trim()) message = body.error.trim();
    } catch {
      // ignore parse errors
    }
    if (response.status === 404) {
      message =
        'アカウント削除機能がサーバーに未設定です。管理者に delete-account Edge Function のデプロイを依頼してください';
    }
    return {
      ok: false,
      reason: 'delete_failed',
      error: message,
    };
  }

  clearDeviceLinkedEmail();
  await client.auth.signOut();
  await ensureAnonymousUserId();

  return {
    ok: true,
    message: 'アカウントとクラウド上のデータを削除しました',
  };
}
