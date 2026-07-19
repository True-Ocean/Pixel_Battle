import type { Card } from '../types';

/** 公開ゴーストデッキ（プール上のスナップショット） */
export interface PublicGhostDeck {
  id: string;
  /** 公開元のデッキスロット */
  slotIndex: number;
  /** 公開時点のデッキ名 */
  deckName: string;
  /** 一覧・履歴・バトル中に表示する作者名 */
  authorName: string;
  /** 作者のユーザーレベル（公開時点） */
  authorLevel: number;
  /** 作者の公開デッキ戦勝利数（公開時点） */
  offlinePvpWins: number;
  /** 作者の公開デッキ戦敗北数（公開時点） */
  offlinePvpLosses: number;
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
  deck_name: string | null;
  author_name: string;
  author_level: number;
  offline_pvp_wins: number;
  offline_pvp_losses: number;
  deck: Card[];
  published_at: string;
  updated_at: string;
}
