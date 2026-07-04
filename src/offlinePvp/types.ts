import type { Card } from '../types';

/** 公開ゴーストデッキ（プール上の不変スナップショット） */
export interface PublicGhostDeck {
  id: string;
  /** 一覧・履歴・バトル中に表示する作者名 */
  authorName: string;
  /** 作者のユーザーレベル（公開時点） */
  authorLevel: number;
  /** ちょうど5枚 */
  deck: Card[];
  /** 任意。シードやサーバーの公開日時 */
  publishedAt?: string;
}
