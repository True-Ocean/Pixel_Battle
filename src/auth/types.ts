import type { User } from '@supabase/supabase-js';

export type AuthFailReason =
  | 'not_configured'
  | 'invalid_email'
  | 'auth_error'
  | 'already_linked'
  | 'no_session'
  | 'rate_limited'
  | 'device_email_locked';

export type AuthActionResult =
  | { ok: true; message: string }
  | { ok: false; reason: AuthFailReason; error: string };

export type AccountLinkStatus = {
  configured: boolean;
  user: User | null;
  /** メール identity があり、匿名ではない */
  linked: boolean;
  email: string | null;
  isAnonymous: boolean;
};
