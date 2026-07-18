import type { UserProfile } from '../types';

export interface PublicProfile {
  ownerId: string;
  username: string;
  avatar?: UserProfile['avatar'];
  level: number;
  cpuBattleWins: number;
  cpuBattleLosses: number;
  offlinePvpBattleWins: number;
  offlinePvpBattleLosses: number;
  onlinePvpBattleWins: number;
  onlinePvpBattleLosses: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfileRow {
  owner_id: string;
  username: string;
  avatar: UserProfile['avatar'] | null;
  level: number;
  cpu_battle_wins: number;
  cpu_battle_losses: number;
  offline_pvp_battle_wins: number;
  offline_pvp_battle_losses: number;
  online_pvp_battle_wins: number;
  online_pvp_battle_losses: number;
  created_at: string;
  updated_at: string;
}

export type SavePublicProfileResult =
  | { ok: true; ownerId: string }
  | {
      ok: false;
      reason: 'not_configured' | 'auth_failed' | 'save_failed';
      error?: string;
    };

export type GetPublicProfileResult =
  | { ok: true; profile: PublicProfile | null }
  | {
      ok: false;
      reason:
        | 'not_configured'
        | 'auth_failed'
        | 'fetch_failed'
        | 'invalid_response';
      error?: string;
    };
