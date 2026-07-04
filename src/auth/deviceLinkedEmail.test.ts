import { describe, expect, it, beforeEach } from 'vitest';
import {
  assertEmailAllowedOnDevice,
  clearDeviceLinkedEmail,
  getDeviceLinkedEmail,
  rememberDeviceLinkedEmail,
} from './deviceLinkedEmail';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('deviceLinkedEmail', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    clearDeviceLinkedEmail();
  });

  it('remembers and clears the device-linked email', () => {
    rememberDeviceLinkedEmail('  Foo@Example.com ');
    expect(getDeviceLinkedEmail()).toBe('foo@example.com');
    clearDeviceLinkedEmail();
    expect(getDeviceLinkedEmail()).toBeNull();
  });

  it('blocks a different email after one is remembered', () => {
    rememberDeviceLinkedEmail('a@example.com');
    const blocked = assertEmailAllowedOnDevice('b@example.com');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error).toContain('a@example.com');
      expect(blocked.error).toContain('連携を解除');
    }
  });

  it('allows the same email', () => {
    rememberDeviceLinkedEmail('a@example.com');
    const allowed = assertEmailAllowedOnDevice('A@Example.com');
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.email).toBe('a@example.com');
  });
});
