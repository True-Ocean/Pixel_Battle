import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import type { AccountLinkStatus } from './types';

export function isAnonymousUser(user: User | null | undefined): boolean {
  return user?.is_anonymous === true;
}

export function resolveAccountEmail(user: User | null | undefined): string | null {
  if (!user) return null;
  if (typeof user.email === 'string' && user.email.length > 0) return user.email;
  const emailIdentity = user.identities?.find((identity) => identity.provider === 'email');
  const identityEmail = emailIdentity?.identity_data?.email;
  return typeof identityEmail === 'string' && identityEmail.length > 0
    ? identityEmail
    : null;
}

export function isEmailLinkedUser(user: User | null | undefined): boolean {
  if (!user || isAnonymousUser(user)) return false;
  return resolveAccountEmail(user) != null;
}

export async function getAuthSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.warn('[auth] getSession failed', error.message);
    return null;
  }
  return data.session;
}

export async function getAuthUser(): Promise<User | null> {
  const session = await getAuthSession();
  return session?.user ?? null;
}

export async function getAccountLinkStatus(): Promise<AccountLinkStatus> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      user: null,
      linked: false,
      email: null,
      isAnonymous: false,
    };
  }
  const user = await getAuthUser();
  const email = resolveAccountEmail(user);
  const anonymous = isAnonymousUser(user);
  return {
    configured: true,
    user,
    linked: !anonymous && email != null,
    email,
    isAnonymous: anonymous,
  };
}

/** Auth 状態変化を購読。解除関数を返す */
export function subscribeAuthState(
  onChange: (user: User | null) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    onChange(null);
    return () => {};
  }

  let active = true;
  void client.auth.getSession().then(({ data }) => {
    if (active) onChange(data.session?.user ?? null);
  });

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });

  return () => {
    active = false;
    subscription.unsubscribe();
  };
}
