import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './createId';

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid'),
    });
    expect(createId()).toBe('test-uuid');
  });

  it('falls back when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    expect(createId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});
