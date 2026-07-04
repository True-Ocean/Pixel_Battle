import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  normalizeEmailInput,
  linkEmailToCurrentUser,
  signInWithEmailPassword,
  formatAuthError,
  MIN_PASSWORD_LENGTH,
} from './emailLink';
import { isAnonymousUser, isEmailLinkedUser, resolveAccountEmail } from './session';
import type { User } from '@supabase/supabase-js';

describe('email validation', () => {
  it('normalizes and validates email', () => {
    expect(normalizeEmailInput('  Foo@Example.COM ')).toBe('foo@example.com');
    expect(isValidEmail('foo@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('validates password length', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('123456')).toBe(true);
    expect(MIN_PASSWORD_LENGTH).toBe(6);
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

describe('linkEmailToCurrentUser / signInWithEmailPassword', () => {
  it('rejects invalid email without calling network when format is bad', async () => {
    const linked = await linkEmailToCurrentUser('bad', 'password1');
    expect(linked.ok).toBe(false);
    if (!linked.ok) expect(linked.reason).toBe('invalid_email');

    const signedIn = await signInWithEmailPassword('bad', 'password1');
    expect(signedIn.ok).toBe(false);
    if (!signedIn.ok) expect(signedIn.reason).toBe('invalid_email');
  });

  it('rejects short passwords without calling network', async () => {
    const linked = await linkEmailToCurrentUser('a@example.com', '12345');
    expect(linked.ok).toBe(false);
    if (!linked.ok) expect(linked.reason).toBe('invalid_password');

    const signedIn = await signInWithEmailPassword('a@example.com', '123');
    expect(signedIn.ok).toBe(false);
    if (!signedIn.ok) expect(signedIn.reason).toBe('invalid_password');
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

  it('maps invalid credentials to a Japanese guidance message', () => {
    const result = formatAuthError('Invalid login credentials');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_credentials');
      expect(result.error).toContain('パスワード');
    }
  });
});
