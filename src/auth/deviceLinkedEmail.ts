const DEVICE_LINKED_EMAIL_KEY = 'dot5-auth-device-linked-email';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** この端末で連携完了したメール（明示的な解除まで保持） */
export function getDeviceLinkedEmail(): string | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(DEVICE_LINKED_EMAIL_KEY);
  if (!raw) return null;
  const email = normalizeEmail(raw);
  return email.length > 0 ? email : null;
}

export function rememberDeviceLinkedEmail(email: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DEVICE_LINKED_EMAIL_KEY, normalizeEmail(email));
}

/** 連携解除時のみ呼ぶ。ログアウトでは消さない */
export function clearDeviceLinkedEmail(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(DEVICE_LINKED_EMAIL_KEY);
}

/**
 * 端末に別メールの連携履歴がある場合は拒否する。
 * 同じメールなら許可。
 */
export function assertEmailAllowedOnDevice(
  emailInput: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const email = normalizeEmail(emailInput);
  const bound = getDeviceLinkedEmail();
  if (bound != null && bound !== email) {
    return {
      ok: false,
      error: `この端末は ${bound} と連携済みです。別のメールにする場合は、先に「連携を解除」してください。`,
    };
  }
  return { ok: true, email };
}
