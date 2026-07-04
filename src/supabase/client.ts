import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
      anonKey &&
      !url.includes('YOUR_PROJECT_REF') &&
      !anonKey.includes('YOUR_ANON'),
  );
}

let client: SupabaseClient | null = null;

/** 未設定時は null（公開デッキ一覧は空） */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        /** マジックリンク戻り時に URL からセッションを復元する */
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });

  }
  return client;
}
