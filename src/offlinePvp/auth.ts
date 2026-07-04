import { getSupabaseClient } from '../supabase/client';

/** 匿名セッションを確保し、ユーザー ID を返す。未設定・失敗時は null */
export async function ensureAnonymousUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    console.warn('[offlinePvp] getSession failed', sessionError.message);
  }
  const existing = sessionData.session?.user?.id;
  if (existing) return existing;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[offlinePvp] anonymous sign-in failed', error.message);
    return null;
  }
  return data.user?.id ?? null;
}
