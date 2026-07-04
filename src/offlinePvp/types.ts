import type { Card } from '../types';

/** 公開ゴーストデッキ（プール上のスナップショット） */
export interface PublicGhostDeck {
  id: string;
  /** 一覧・履歴・バトル中に表示する作者名 */
  authorName: string;
  /** 作者のユーザーレベル（公開時点） */
  authorLevel: number;
  /** ちょうど5枚 */
  deck: Card[];
  /** 任意。サーバーの公開日時 */
  publishedAt?: string;
  /** リモート所有者。一覧から自分を除外するのに使用 */
  ownerId?: string;
}

export interface PublicGhostDeckRow {
  id: string;
  owner_id: string;
  slot_index: number;
  author_name: string;
  author_level: number;
  deck: Card[];
  published_at: string;
  updated_at: string;
}
