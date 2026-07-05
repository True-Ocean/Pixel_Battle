import { describe, expect, it, vi } from 'vitest';
import { clearLocalSave, loadSave } from './index';
import { createInitialProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

describe('clearLocalSave', () => {
  it('removes stored save so loadSave returns empty profile', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: createInitialProfile('tester'),
          decks: [],
        }),
      );
      clearLocalSave();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(loadSave().user).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
