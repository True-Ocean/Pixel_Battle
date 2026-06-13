/** HTTP の LAN アクセスなど非セキュアコンテキストでも使える ID 生成 */
export function createId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
