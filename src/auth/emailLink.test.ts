import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  normalizeEmailInput,
  linkEmailToCurrentUser,
  signInWithEmailMagicLink,
  verifyEmailOtp,
  formatAuthError,
} from './emailLink';
import { isAnonymousUser, isEmailLinkedUser, resolveAccountEmail } from './session';
import type { User } from '@supabase/supabase-js';

describe('email validation', () => {
  it('normalizes and validates email', () => {
    expect(normalizeEmailInput('  Foo@Example.COM ')).toBe('foo@example.com');
    expect(isValidEmail('foo@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('session helpers', () => {
  it('detects anonymous and linked users', () => {
    const anonymous = {
      is_anonymous: true,
      email: undefined,
      identities: [],
    } as unknown as User;
    expect(isAnonymousUser(anonymous)).toBe(true);
    expect(isEmailLinkedUser(anonymous)).toBe(false);

    const linked = {
      is_anonymous: false,
      email: 'a@b.com',
      identities: [{ provider: 'email', identity_data: { email: 'a@b.com' } }],
    } as unknown as User;
    expect(isAnonymousUser(linked)).toBe(false);
    expect(isEmailLinkedUser(linked)).toBe(true);
    expect(resolveAccountEmail(linked)).toBe('a@b.com');
  });
});

describe('linkEmailToCurrentUser / signInWithEmailMagicLink', () => {
  it('rejects invalid email without calling network when format is bad', async () => {
    const linked = await linkEmailToCurrentUser('bad');
    expect(linked.ok).toBe(false);
    if (!linked.ok) expect(linked.reason).toBe('invalid_email');

    const signedIn = await signInWithEmailMagicLink('bad');
    expect(signedIn.ok).toBe(false);
    if (!signedIn.ok) expect(signedIn.reason).toBe('invalid_email');
  });
});

describe('formatAuthError', () => {
  it('maps email rate limit to a Japanese guidance message', () => {
    const result = formatAuthError('email rate limit exceeded');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('rate_limited');
      expect(result.error).toContain('送信回数上限');
    }
  });

  it('maps already-registered email to a Japanese guidance message', () => {
    const result = formatAuthError(
      'A user with this email address has already been registered',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('email_already_registered');
      expect(result.error).toContain('登録済み');
      expect(result.error).toContain('ログイン');
    }
  });
});

describe('verifyEmailOtp', () => {
  it('rejects non-numeric or short tokens without network', async () => {
    const result = await verifyEmailOtp('a@example.com', '12ab', 'link');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_otp');
  });
});
