import type { Card } from '../types';
import type { BattleActionChoice, BattleState, BoardPosition } from '../types/battle';
import type { PoisonDoTPlayback } from '../game/turnResult';
import type { OnlineClashPlaybackEvents } from './onlineClashPlayback';

export type OnlineBattleRoomStatus =
  | 'waiting'
  | 'deck_select'
  | 'setup'
  | 'battle'
  | 'rematch_wait'
  | 'closed';

export type OnlineBattleRole = 'host' | 'guest';

export type OnlineBattleFormation = Record<BoardPosition, string | null>;

export type OnlineBattlePhase =
  | 'select'
  | 'promotion'
  | 'turn_start';

/** clash 確定時のアニメ replay 用（host 視点・§7.2 playbackEvents） */
export interface OnlineLastClash {
  turn: number;
  hostChoice: BattleActionChoice;
  guestChoice: BattleActionChoice;
  preClashRevision: number;
  /** サーバー resolveTurn 結果のイベント列（再シミュレーション禁止） */
  playbackEvents: OnlineClashPlaybackEvents;
  /** turn_start 連鎖で付与された毒 DoT（なければ空/省略） */
  poisonDots?: PoisonDoTPlayback[];
  /** 毒 DoT 適用前（overlay 開始盤面） */
  stateBeforePoison?: BattleState;
  /** 毒 DoT 適用後 */
  stateAfterPoison?: BattleState;
}
export interface OnlineBattleRoomRow {
  id: string;
  code: string;
  host_user_id: string;
  guest_user_id: string | null;
  host_name: string;
  guest_name: string | null;
  host_level: number;
  guest_level: number | null;
  status: OnlineBattleRoomStatus;
  host_balance: number;
  guest_balance: number | null;
  host_deck: Card[] | null;
  guest_deck: Card[] | null;
  host_formation: OnlineBattleFormation | null;
  guest_formation: OnlineBattleFormation | null;
  host_setup_ready: boolean;
  guest_setup_ready: boolean;
  battle_state: BattleState | null;
  host_pending_action: BattleActionChoice | null;
  guest_pending_action: BattleActionChoice | null;
  host_rematch_ready: boolean;
  guest_rematch_ready: boolean;
  host_deck_change: boolean;
  guest_deck_change: boolean;
  disconnect_user_id: string | null;
  disconnect_deadline: string | null;
  last_transfer_px: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  setup_started_at: string | null;
  closed_by_role: OnlineBattleRole | null;
  battle_revision: number;
  battle_phase: OnlineBattlePhase;
  last_clash: OnlineLastClash | null;
  power_balance_applied: boolean;
  host_phase_timer_ready: boolean;
  guest_phase_timer_ready: boolean;
  phase_timer_started_at: string | null;
}

export interface OnlineBattleRoom {
  id: string;
  code: string;
  status: OnlineBattleRoomStatus;
  hostUserId: string;
  guestUserId: string | null;
  hostName: string;
  guestName: string | null;
  hostLevel: number;
  guestLevel: number | null;
  hostBalance: number;
  guestBalance: number | null;
  hostDeck: Card[] | null;
  guestDeck: Card[] | null;
  hostFormation: OnlineBattleFormation | null;
  guestFormation: OnlineBattleFormation | null;
  hostSetupReady: boolean;
  guestSetupReady: boolean;
  battleState: BattleState | null;
  hostPendingAction: BattleActionChoice | null;
  guestPendingAction: BattleActionChoice | null;
  hostRematchReady: boolean;
  guestRematchReady: boolean;
  hostDeckChange: boolean;
  guestDeckChange: boolean;
  disconnectUserId: string | null;
  disconnectDeadline: string | null;
  lastTransferPx: number | null;
  expiresAt: string;
  updatedAt: string;
  setupStartedAt: string | null;
  /** ルームを閉じた側（相手への退出通知用） */
  closedByRole: OnlineBattleRole | null;
  battleRevision: number;
  battlePhase: OnlineBattlePhase;
  lastClash: OnlineLastClash | null;
  /** バトル開始時に戦力補正が適用されたか */
  powerBalanceApplied: boolean;
  hostPhaseTimerReady: boolean;
  guestPhaseTimerReady: boolean;
  phaseTimerStartedAt: string | null;
}

export type OnlineRoomErrorCode =
  | 'not_configured'
  | 'auth_failed'
  | 'insufficient_px'
  | 'room_not_found'
  | 'room_full'
  | 'room_expired'
  | 'room_closed'
  | 'already_in_room'
  | 'network_error';

export type OnlineRoomResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: OnlineRoomErrorCode; message: string };

export function mapOnlineBattleRoom(row: OnlineBattleRoomRow): OnlineBattleRoom {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    hostUserId: row.host_user_id,
    guestUserId: row.guest_user_id,
    hostName: row.host_name,
    guestName: row.guest_name,
    hostLevel: row.host_level,
    guestLevel: row.guest_level,
    hostBalance: row.host_balance,
    guestBalance: row.guest_balance,
    hostDeck: row.host_deck,
    guestDeck: row.guest_deck,
    hostFormation: row.host_formation,
    guestFormation: row.guest_formation,
    hostSetupReady: row.host_setup_ready,
    guestSetupReady: row.guest_setup_ready,
    battleState: row.battle_state,
    hostPendingAction: row.host_pending_action,
    guestPendingAction: row.guest_pending_action,
    hostRematchReady: row.host_rematch_ready,
    guestRematchReady: row.guest_rematch_ready,
    hostDeckChange: row.host_deck_change,
    guestDeckChange: row.guest_deck_change,
    disconnectUserId: row.disconnect_user_id,
    disconnectDeadline: row.disconnect_deadline,
    lastTransferPx: row.last_transfer_px,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
    setupStartedAt: row.setup_started_at ?? null,
    closedByRole: row.closed_by_role ?? null,
    battleRevision: row.battle_revision ?? 0,
    battlePhase: row.battle_phase ?? 'select',
    lastClash: row.last_clash ?? null,
    powerBalanceApplied: row.power_balance_applied ?? false,
    hostPhaseTimerReady: row.host_phase_timer_ready ?? false,
    guestPhaseTimerReady: row.guest_phase_timer_ready ?? false,
    phaseTimerStartedAt: row.phase_timer_started_at ?? null,
  };
}

export function roleForUser(
  room: OnlineBattleRoom,
  userId: string,
): OnlineBattleRole | null {
  if (room.hostUserId === userId) return 'host';
  if (room.guestUserId === userId) return 'guest';
  return null;
}

export function opponentIdentity(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): { name: string; level: number } {
  if (role === 'host') {
    return {
      name: room.guestName ?? '…',
      level: room.guestLevel ?? 1,
    };
  }
  return {
    name: room.hostName,
    level: room.hostLevel,
  };
}

export function myBalance(room: OnlineBattleRoom, role: OnlineBattleRole): number {
  return role === 'host' ? room.hostBalance : (room.guestBalance ?? 0);
}

export function opponentBalance(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): number {
  return role === 'host' ? (room.guestBalance ?? 0) : room.hostBalance;
}

/** バナー表示用: 相手の所持 px（未同期なら undefined） */
export function opponentWalletPx(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): number | undefined {
  if (role === 'host') {
    return room.guestBalance != null ? room.guestBalance : undefined;
  }
  return room.hostBalance;
}
