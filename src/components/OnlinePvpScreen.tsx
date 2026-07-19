import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DeckLayout } from '../types';
import { getDeckCards, isDeckBattleReady, normalizeDeckLayout } from '../deckSlots';
import { getOnlinePvpModeHelp } from '../config/helpContent';
import {
  ONLINE_PVP_MIN_WALLET_PX,
  createOnlineBattleRoom,
  fetchOnlineBattleRoom,
  joinOnlineBattleRoom,
  isValidRoomCode,
  normalizeRoomCodeInput,
  padRoomCode,
  subscribeOnlineBattleRoom,
  tryAdvanceToSetup,
  isPostOnlineDeckSelectStatus,
  type OnlineBattleRoom,
  type OnlineBattleRole,
  type OnlineRoomResult,
} from '../onlinePvp';
import { BattleDeckSelectScreen } from './BattleDeckSelectScreen';
import { BattleModeHeader } from './BattleModeHeader';
import { ConfirmDialog } from './ConfirmDialog';
import {
  HelpInlinePxCost,
  HelpInlinePxIcon,
} from './HelpInlineEconomy';
import { HelpPanelModal } from './HelpPanelModal';

type OnlinePvpPhase = 'entry' | 'lobby' | 'deckSelect';

interface OnlinePvpScreenProps {
  userName: string;
  userLevel: number;
  walletPx: number;
  userId: string | null;
  supabaseConfigured: boolean;
  decks: DeckLayout[];
  deckNames?: string[];
  unlockedDeckCount: number;
  lastBattleDeckIndex: number;
  onBack: () => void;
  onRoomUpdated: (room: OnlineBattleRoom, role: OnlineBattleRole) => void;
  onOpponentLeft: () => void;
  onGoToMyDeck: (deckIndex: number, cardId: string) => void;
  onReorderDeckAt: (deckIndex: number, layout: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
  /** バトル画面から再戦デッキ選択へ戻るとき等 */
  resumeRoom?: OnlineBattleRoom | null;
  resumeRole?: OnlineBattleRole | null;
}

function errorMessage(result: Extract<OnlineRoomResult<unknown>, { ok: false }>): string {
  return result.message;
}

export function OnlinePvpScreen({
  userName,
  userLevel,
  walletPx,
  userId,
  supabaseConfigured,
  decks,
  deckNames,
  unlockedDeckCount,
  lastBattleDeckIndex,
  onBack,
  onRoomUpdated,
  onOpponentLeft,
  onGoToMyDeck,
  onReorderDeckAt,
  onMoveCardBetweenDecks,
  resumeRoom = null,
  resumeRole = null,
}: OnlinePvpScreenProps) {
  const [phase, setPhase] = useState<OnlinePvpPhase>(() => {
    if (!resumeRoom) return 'entry';
    if (resumeRoom.status === 'deck_select') return 'deckSelect';
    if (resumeRoom.status === 'waiting' && resumeRole === 'host') return 'lobby';
    if (isPostOnlineDeckSelectStatus(resumeRoom.status)) return 'deckSelect';
    return 'entry';
  });
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<OnlineBattleRoom | null>(
    () => resumeRoom ?? null,
  );
  const [role, setRole] = useState<OnlineBattleRole | null>(
    () => resumeRole ?? null,
  );
  const [deckConfirmed, setDeckConfirmed] = useState(() => {
    if (!resumeRoom || !resumeRole || resumeRoom.status !== 'deck_select') {
      return false;
    }
    const ownDeck =
      resumeRole === 'host' ? resumeRoom.hostDeck : resumeRoom.guestDeck;
    return ownDeck != null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [insufficientPxAction, setInsufficientPxAction] = useState<
    'create' | 'join' | null
  >(null);
  const [invalidCodeOpen, setInvalidCodeOpen] = useState(false);
  const modeHelp = getOnlinePvpModeHelp();
  const advancingRef = useRef(false);
  const roleRef = useRef<OnlineBattleRole | null>(resumeRole ?? null);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useLayoutEffect(() => {
    if (!resumeRoom || !resumeRole) return;
    if (isPostOnlineDeckSelectStatus(resumeRoom.status)) {
      onRoomUpdated(resumeRoom, resumeRole);
    }
  }, [resumeRoom, resumeRole, onRoomUpdated]);

  const navigateIfReady = useCallback(
    (nextRoom: OnlineBattleRoom, nextRole: OnlineBattleRole) => {
      if (!isPostOnlineDeckSelectStatus(nextRoom.status)) return;
      onRoomUpdated(nextRoom, nextRole);
    },
    [onRoomUpdated],
  );

  const tryNavigateToSetup = useCallback(
    async (nextRoom: OnlineBattleRoom) => {
      const currentRole = roleRef.current;
      if (!currentRole) return;

      if (isPostOnlineDeckSelectStatus(nextRoom.status)) {
        navigateIfReady(nextRoom, currentRole);
        return;
      }

      if (
        nextRoom.status !== 'deck_select' ||
        !nextRoom.hostDeck ||
        !nextRoom.guestDeck
      ) {
        return;
      }

      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        const advanced = await tryAdvanceToSetup(nextRoom);
        if (!advanced.ok) {
          setError(errorMessage(advanced));
          return;
        }
        setRoom(advanced.data);
        navigateIfReady(advanced.data, currentRole);
      } finally {
        advancingRef.current = false;
      }
    },
    [navigateIfReady],
  );

  const handleIncomingRoom = useCallback(
    (next: OnlineBattleRoom) => {
      setRoom(next);
      const currentRole = roleRef.current;
      if (
        next.status === 'closed' &&
        next.closedByRole &&
        currentRole &&
        next.closedByRole !== currentRole
      ) {
        setLeaveConfirmOpen(false);
        onOpponentLeft();
        return;
      }
      void tryNavigateToSetup(next);
    },
    [onOpponentLeft, tryNavigateToSetup],
  );

  useEffect(() => {
    if (!room?.id) return;
    return subscribeOnlineBattleRoom(room.id, (next) => {
      handleIncomingRoom(next);
    });
  }, [handleIncomingRoom, room?.id]);

  useEffect(() => {
    if (!deckConfirmed || !room?.id) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const fresh = await fetchOnlineBattleRoom(room.id);
      if (cancelled || !fresh.ok) return;
      if (fresh.data.status !== 'deck_select') {
        cancelled = true;
      }
      handleIncomingRoom(fresh.data);
    };

    void poll();
    const intervalId = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [deckConfirmed, handleIncomingRoom, room?.id]);

  // room / userId から自分のロール・フェーズ・デッキ確定状態を、レンダー中に同期する。
  // onRoomUpdated（画面遷移）は副作用なので下の effect に残す。
  const [prevRoleSync, setPrevRoleSync] = useState<{
    room: OnlineBattleRoom | null;
    userId: string | null;
  }>({ room, userId });
  if (prevRoleSync.room !== room || prevRoleSync.userId !== userId) {
    setPrevRoleSync({ room, userId });
    if (room && userId) {
      const myRole: OnlineBattleRole | null =
        room.hostUserId === userId
          ? 'host'
          : room.guestUserId === userId
            ? 'guest'
            : null;
      if (myRole) {
        setRole(myRole);
        if (isPostOnlineDeckSelectStatus(room.status)) {
          // 画面遷移は下の effect で行う
        } else if (room.status === 'waiting' && myRole === 'host') {
          setPhase('lobby');
        } else if (room.status === 'deck_select') {
          setPhase('deckSelect');
          const ownDeck = myRole === 'host' ? room.hostDeck : room.guestDeck;
          setDeckConfirmed(ownDeck != null);
        }
      }
    }
  }

  useEffect(() => {
    if (!room || !userId) return;
    const myRole: OnlineBattleRole | null =
      room.hostUserId === userId
        ? 'host'
        : room.guestUserId === userId
          ? 'guest'
          : null;
    if (!myRole) return;

    if (isPostOnlineDeckSelectStatus(room.status)) {
      onRoomUpdated(room, myRole);
    }
  }, [room, userId, onRoomUpdated]);

  const canAffordEntry = walletPx >= ONLINE_PVP_MIN_WALLET_PX;

  const handleCreate = useCallback(async () => {
    if (!supabaseConfigured) {
      setError('Supabase が未設定です');
      return;
    }
    if (!canAffordEntry) {
      setError(null);
      setInsufficientPxAction('create');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createOnlineBattleRoom({
      hostName: userName,
      hostLevel: userLevel,
      hostWalletPx: walletPx,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    setRoom(result.data);
    setRole('host');
    onRoomUpdated(result.data, 'host');
    setPhase('lobby');
  }, [
    canAffordEntry,
    onRoomUpdated,
    supabaseConfigured,
    userLevel,
    userName,
    walletPx,
  ]);

  const handleJoin = useCallback(async () => {
    if (!supabaseConfigured) {
      setError('Supabase が未設定です');
      return;
    }
    if (!canAffordEntry) {
      setError(null);
      setInsufficientPxAction('join');
      return;
    }
    const code = padRoomCode(joinCode);
    if (!isValidRoomCode(code) || normalizeRoomCodeInput(joinCode).length !== 6) {
      setError(null);
      setInvalidCodeOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await joinOnlineBattleRoom({
      code,
      guestName: userName,
      guestLevel: userLevel,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.code === 'room_not_found') {
        setInvalidCodeOpen(true);
        return;
      }
      setError(errorMessage(result));
      return;
    }
    const joinedRole =
      result.data.hostUserId === userId ? 'host' : 'guest';
    let roomAfterJoin = result.data;
    if (joinedRole === 'guest') {
      const synced = await import('../onlinePvp').then(({ syncOnlineWalletBalance }) =>
        syncOnlineWalletBalance(result.data.id, 'guest', walletPx),
      );
      if (synced.ok) {
        roomAfterJoin = synced.data;
      }
    }
    setRoom(roomAfterJoin);
    setRole(joinedRole);
    onRoomUpdated(roomAfterJoin, joinedRole);
    setPhase(result.data.status === 'deck_select' ? 'deckSelect' : 'lobby');
  }, [
    canAffordEntry,
    joinCode,
    onRoomUpdated,
    supabaseConfigured,
    userId,
    userLevel,
    userName,
    walletPx,
  ]);

  const handleDeckStart = useCallback(
    async (deckIndex: number) => {
      if (!room || !role || deckConfirmed || busy) return;
      const layout = normalizeDeckLayout(decks[deckIndex] ?? []);
      if (!isDeckBattleReady(layout)) return;
      const deck = getDeckCards(layout);
      setBusy(true);
      setError(null);
      const submitted = await import('../onlinePvp').then(({ submitOnlineDeck }) =>
        submitOnlineDeck(room.id, role, deck, walletPx),
      );
      if (!submitted.ok) {
        setBusy(false);
        setError(errorMessage(submitted));
        return;
      }
      setDeckConfirmed(true);
      setRoom(submitted.data);
      await tryNavigateToSetup(submitted.data);
      setBusy(false);
    },
    [busy, deckConfirmed, decks, room, role, tryNavigateToSetup, walletPx],
  );

  if (
    room &&
    role &&
    isPostOnlineDeckSelectStatus(room.status)
  ) {
    return null;
  }

  if (phase === 'deckSelect' && room && role) {
    const waitingOpponent =
      deckConfirmed && (!room.hostDeck || !room.guestDeck);
    const bothDecksReady = Boolean(room.hostDeck && room.guestDeck);
    const waitingStatusMessage = deckConfirmed
      ? waitingOpponent
        ? '相手のデッキ選択を待っています…'
        : bothDecksReady
          ? 'バトル準備へ移動中…'
          : undefined
      : undefined;

    return (
      <>
        <BattleDeckSelectScreen
          decks={decks}
          deckNames={deckNames}
          unlockedDeckCount={unlockedDeckCount}
          lastBattleDeckIndex={lastBattleDeckIndex}
          backLabel="ルームから退出"
          title="フレンド対戦（オンライン）"
          battleMode="friend"
          startButtonLabel="デッキ確定"
          waitingStatusMessage={waitingStatusMessage}
          startBattleDisabled={deckConfirmed || busy}
          onStartBattle={handleDeckStart}
          onBack={() => setLeaveConfirmOpen(true)}
          onGoToMyDeck={onGoToMyDeck}
          onReorderDeckAt={onReorderDeckAt}
          onMoveCardBetweenDecks={onMoveCardBetweenDecks}
        />
        {error && (
          <p className="online-pvp-error" role="alert">
            {error}
          </p>
        )}
        <ConfirmDialog
          open={leaveConfirmOpen}
          title="ルームから退出"
          message="ルームから退出しますか？"
          confirmLabel="退出する"
          cancelLabel="対戦を続ける"
          confirmVariant="danger"
          onConfirm={() => {
            setLeaveConfirmOpen(false);
            onBack();
          }}
          onCancel={() => setLeaveConfirmOpen(false)}
        />
      </>
    );
  }

  if (phase === 'lobby' && room) {
    return (
      <section className="screen screen-online-pvp-lobby">
        <header className="offline-pvp-list-header">
          <BattleModeHeader
            mode="friend"
            onHelp={() => setHelpOpen(true)}
            helpAriaLabel={`${modeHelp.title}のヘルプ`}
          />
          <div className="battle-deck-select-subheader">
            <h2>対戦相手を待機中</h2>
            <div className="battle-deck-select-subheader-guide" role="note">
              <p>ルームコードを友達に共有してください</p>
            </div>
          </div>
        </header>
        <div className="online-pvp-entry-body online-pvp-lobby-body">
          <div className="online-pvp-lobby-content">
            <div className="online-pvp-lobby-panel">
              <p className="online-pvp-room-code-label">ルームコード</p>
              <p className="online-pvp-room-code" aria-live="polite">
                {padRoomCode(room.code)}
              </p>
            </div>
          </div>
        </div>
        <div className="battle-mode-bottom-nav">
          <button
            type="button"
            className="battle-mode-bottom-nav-danger"
            onClick={() => setLeaveConfirmOpen(true)}
          >
            ルームから退出
          </button>
        </div>
        {helpOpen && (
          <HelpPanelModal topic={modeHelp} onClose={() => setHelpOpen(false)} />
        )}
        <ConfirmDialog
          open={leaveConfirmOpen}
          title="ルームから退出"
          message="ルームから退出しますか？"
          confirmLabel="退出する"
          cancelLabel="対戦を続ける"
          confirmVariant="danger"
          onConfirm={() => {
            setLeaveConfirmOpen(false);
            onBack();
          }}
          onCancel={() => setLeaveConfirmOpen(false)}
        />
      </section>
    );
  }

  return (
    <section className="screen screen-online-pvp-entry">
      <header className="offline-pvp-list-header">
        <BattleModeHeader
          mode="friend"
          onHelp={() => setHelpOpen(true)}
          helpAriaLabel={`${modeHelp.title}のヘルプ`}
        />
      </header>

      <div className="online-pvp-entry-body">
        <div className="online-pvp-entry-panel">
          {!supabaseConfigured && (
            <p className="muted online-pvp-entry-notice">
              Supabase 未設定のため利用できません
            </p>
          )}

          <div className="online-pvp-entry-section">
            <div className="battle-deck-select-subheader">
              <h2>ルームを作る</h2>
              <div className="battle-deck-select-subheader-guide" role="note">
                <p>6桁のコードをフレンドに共有して招待</p>
              </div>
            </div>
            <button
              type="button"
              className="battle-hub-mode-btn online-pvp-action-btn"
              disabled={busy || !supabaseConfigured}
              onClick={() => void handleCreate()}
            >
              ルームを作る
            </button>
          </div>

          <div className="online-pvp-join-section">
            <div className="battle-deck-select-subheader">
              <h2>ルームに入る</h2>
              <div className="battle-deck-select-subheader-guide" role="note">
                <p>フレンドから共有された6桁のコードを入力</p>
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="online-pvp-code-input"
              placeholder="6桁コード"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(normalizeRoomCodeInput(e.target.value))
              }
              aria-label="ルームコード"
            />
            <button
              type="button"
              className="battle-hub-mode-btn online-pvp-action-btn"
              disabled={busy || !supabaseConfigured}
              onClick={() => void handleJoin()}
            >
              ルームに入る
            </button>
          </div>

          {error && (
            <p className="online-pvp-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          バトルモード選択に戻る
        </button>
      </div>
      {helpOpen && (
        <HelpPanelModal topic={modeHelp} onClose={() => setHelpOpen(false)} />
      )}
      <ConfirmDialog
        open={insufficientPxAction != null}
        message={
          <>
            フレンド対戦時には、
            <HelpInlinePxCost amount={ONLINE_PVP_MIN_WALLET_PX} />
            以上保有している必要があります。現在、保有
            <HelpInlinePxIcon />
            が不足しているため、
            {insufficientPxAction === 'create'
              ? 'ルームを作れません。'
              : 'ルームに入れません。'}
          </>
        }
        confirmLabel="OK"
        cancelLabel={null}
        confirmVariant="primary"
        className="online-pvp-insufficient-dialog"
        onConfirm={() => setInsufficientPxAction(null)}
        onCancel={() => setInsufficientPxAction(null)}
      />
      <ConfirmDialog
        open={invalidCodeOpen}
        message="正しい6桁のコードを入力してください。"
        confirmLabel="OK"
        cancelLabel={null}
        confirmVariant="primary"
        className="online-pvp-insufficient-dialog"
        onConfirm={() => setInvalidCodeOpen(false)}
        onCancel={() => setInvalidCodeOpen(false)}
      />
    </section>
  );
}
