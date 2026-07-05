import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { deleteAccount } from './deleteAccount';

vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }),
}));

vi.mock('./session', () => ({
  getAuthUser: vi.fn(async () => ({
    is_anonymous: false,
    email: 'player@example.com',
    identities: [{ provider: 'email' }],
  })),
  getAuthSession: vi.fn(async () => ({ access_token: 'test-token' })),
  isEmailLinkedUser: (user: { is_anonymous?: boolean; email?: string }) =>
    Boolean(user?.email) && user?.is_anonymous !== true,
  resolveAccountEmail: (user: { email?: string }) => user.email ?? null,
}));

vi.mock('./anonymous', () => ({
  ensureAnonymousUserId: vi.fn(async () => 'anon-id'),
}));

vi.mock('./deviceLinkedEmail', () => ({
  clearDeviceLinkedEmail: vi.fn(),
}));

describe('deleteAccount', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('rejects short passwords without calling delete endpoint', async () => {
    const result = await deleteAccount('12345');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_password');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls delete-account edge function with bearer token', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await deleteAccount('password1');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/delete-account',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('maps edge function errors to delete_failed', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
      }),
    );

    const result = await deleteAccount('password1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('delete_failed');
      expect(result.error).toContain('Server misconfigured');
    }
  });
});
