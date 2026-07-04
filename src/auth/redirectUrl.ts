/** マジックリンク戻り先（本番・開発のオリジン + Vite base） */
export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${normalized}`;
}
