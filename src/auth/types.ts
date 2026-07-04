import type { User } from '@supabase/supabase-js';

export type AuthFailReason =
  | 'not_configured'
  | 'invalid_email'
  | 'invalid_password'
  | 'invalid_credentials'
  | 'auth_error'
  | 'already_linked'
  | 'no_session'
  | 'rate_limited'
  | 'device_email_locked'
  | 'email_already_registered'
  | 'email_confirmation_required';

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
