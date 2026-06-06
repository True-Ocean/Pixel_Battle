/** Lv0 属性 */
export type Attribute = 'attack' | 'defense';

/** パレット色（#RRGGBB または null = 未塗り） */
export type PixelColor = string | null;

export type PixelGrid = PixelColor[][];

export interface Card {
  id: string;
  name: string;
  pixels: PixelGrid;
  attribute: Attribute;
  hp: number;
  wins: number;
  losses: number;
  reviveCount: number;
  createdAt: string;
}

/** ユーザープロフィール（localStorage 永続化） */
export interface UserProfile {
  username: string;
  level: number;
  exp: number;
}

export interface SaveData {
  user: UserProfile | null;
  deck: Card[];
}

/** アプリ画面（ルーターなし・state で切替） */
export type ScreenId = 'setup' | 'deck' | 'editor' | 'battleSetup' | 'battle';

export interface NavigationState {
  screen: ScreenId;
  /** 戦闘セットアップ・戦闘へ渡す選択中のカード ID（最大3） */
  selectedCardIds?: string[];
}
