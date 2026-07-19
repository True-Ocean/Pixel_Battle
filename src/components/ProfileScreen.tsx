import { useMemo, useState, type CSSProperties } from 'react';
import { getRarityMeta } from '../config/rarity';
import {
  OFFLINE_PVP_MIN_USER_LEVEL,
  type PublicGhostDeck,
} from '../offlinePvp';
import type {
  Card,
  SubscriptionPlan,
  UserProfile,
  UserSubscription,
} from '../types';
import {
  DEFAULT_PROFILE_COMMENT,
  finalizeProfileComment,
  getActiveSubscriptionPlan,
} from '../user';
import { OfflinePvpDeckDetailOverlay } from './OfflinePvpDeckDetailOverlay';
import { CardPreview } from './CardPreview';
import { PixelIconPreview } from './PixelIconPreview';
import { ProfileCommentEditModal } from './ProfileCommentEditModal';

export interface ProfileDisplayUser {
  username: string;
  profileComment?: string;
  avatar?: UserProfile['avatar'];
  level: number;
  cpuBattleWins: number | null;
  cpuBattleLosses: number | null;
  offlinePvpBattleWins: number | null;
  offlinePvpBattleLosses: number | null;
  onlinePvpBattleWins: number | null;
  onlinePvpBattleLosses: number | null;
  subscriptionPlan?: SubscriptionPlan;
}

export interface ProfilePublishedDeck {
  slotIndex: number;
  name: string;
  cards: Card[];
  /** 公開デッキ戦のリモートID。対戦開始時に必要 */
  ghostId?: string;
  ownerId?: string;
}

export interface ProfileScreenProps {
  user: ProfileDisplayUser;
  /** 自分のプロフィールでのみ指定する。 */
  subscription?: UserSubscription;
  publishedDecks: readonly ProfilePublishedDeck[];
  /** 公開プロフィール取得中。暫定情報を出さずにローディングを表示する。 */
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  onBack: () => void;
  onOpenAvatar: () => void;
  /** 自分のプロフィールでのみ指定する。 */
  onCommentChange?: (comment: string | undefined) => void;
  /** 他ユーザーの公開デッキと対戦するとき */
  viewerDeckPower?: number | null;
  canBattle?: boolean;
  offlinePvpUnlocked?: boolean;
  ownerId?: string | null;
  onChallengeDeck?: (ghost: PublicGhostDeck) => void;
}

const AVATAR_PREVIEW_SIZE = 96;

function toPublicGhostDeck(
  deck: ProfilePublishedDeck,
  user: ProfileDisplayUser,
  ownerId?: string | null,
): PublicGhostDeck {
  return {
    id:
      deck.ghostId ??
      `profile-${ownerId ?? deck.ownerId ?? 'local'}-${deck.slotIndex}`,
    slotIndex: deck.slotIndex,
    deckName: deck.name,
    authorName: user.username,
    authorLevel: user.level,
    offlinePvpWins: user.offlinePvpBattleWins ?? 0,
    offlinePvpLosses: user.offlinePvpBattleLosses ?? 0,
    deck: deck.cards,
    ...(ownerId || deck.ownerId
      ? { ownerId: ownerId ?? deck.ownerId }
      : {}),
  };
}

function formatWinRate(wins: number | null, losses: number | null): string {
  if (wins == null || losses == null) return '—';
  const total = wins + losses;
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

function ProfileRecordRow({
  label,
  wins,
  losses,
}: {
  label: string;
  wins: number | null;
  losses: number | null;
}) {
  return (
    <div className="profile-record-row">
      <span className="profile-record-label">{label}</span>
      <span className="profile-record-stats">
        <span className="profile-record-wins">
          {wins == null ? '—' : `${wins}勝`}
        </span>
        <span className="profile-record-losses">
          {losses == null ? '—' : `${losses}敗`}
        </span>
        <span className="profile-record-rate" aria-label="勝率">
          {formatWinRate(wins, losses)}
        </span>
      </span>
    </div>
  );
}

export function ProfileScreen({
  user,
  subscription,
  publishedDecks,
  loading = false,
  loadError = false,
  onRetry,
  onBack,
  onOpenAvatar,
  onCommentChange,
  viewerDeckPower = null,
  canBattle = false,
  offlinePvpUnlocked = false,
  ownerId = null,
  onChallengeDeck,
}: ProfileScreenProps) {
  const [selectedGhost, setSelectedGhost] = useState<PublicGhostDeck | null>(
    null,
  );
  const [commentEditing, setCommentEditing] = useState(false);
  const battleBlockedMessage = useMemo(() => {
    if (!offlinePvpUnlocked) {
      return `公開デッキ戦は Lv${OFFLINE_PVP_MIN_USER_LEVEL} で解放されます。`;
    }
    return '5枚揃ったデッキがありません。マイデッキで編成してください。';
  }, [offlinePvpUnlocked]);
  const activePlan = subscription
    ? getActiveSubscriptionPlan(subscription)
    : (user.subscriptionPlan ?? 'none');
  const trimmedName = user.username.trim();
  const initialChar = trimmedName.charAt(0) || '?';
  const displayComment =
    finalizeProfileComment(user.profileComment ?? '') ??
    DEFAULT_PROFILE_COMMENT;

  const startCommentEdit = () => {
    setCommentEditing(true);
  };

  const saveComment = (comment: string | undefined) => {
    onCommentChange?.(comment);
  };

  return (
    <section className="screen profile-screen">
      {loading ? (
        <div className="profile-body profile-body--loading">
          <div className="profile-loading" role="status">
            <span className="profile-loading-spinner" aria-hidden />
            <span>プロフィールを読み込み中…</span>
          </div>
        </div>
      ) : (
      <div className="profile-body">
        {loadError && (
          <div className="profile-load-status" role="status">
            <span>
              最新情報を取得できなかったため、対戦時の情報を表示しています。
            </span>
            {onRetry && (
              <button type="button" onClick={onRetry}>
                再読み込み
              </button>
            )}
          </div>
        )}

        <div className="profile-overview">
          <div className="profile-user">
            <button
              type="button"
              className={`profile-avatar-frame profile-avatar-frame--${activePlan}`}
              aria-label="アバターを拡大表示"
              onClick={onOpenAvatar}
            >
              {user.avatar ? (
                <PixelIconPreview
                  className="profile-avatar-preview"
                  pixels={user.avatar.pixels}
                  size={AVATAR_PREVIEW_SIZE}
                />
              ) : (
                <span className="profile-avatar-initial" aria-hidden>
                  {initialChar}
                </span>
              )}
            </button>
          </div>

          <div className="profile-details">
            <div className="profile-identity">
              <p className="profile-name">{user.username}</p>
              {activePlan !== 'none' && (
                <span
                  className={`profile-subscription-crown profile-subscription-crown--${activePlan}`}
                  role="img"
                  aria-label={
                    activePlan === 'premium'
                      ? 'プレミアムプラン'
                      : 'ライトプラン'
                  }
                  title={
                    activePlan === 'premium'
                      ? 'プレミアムプラン'
                      : 'ライトプラン'
                  }
                >
                  <svg viewBox="0 0 18 18" aria-hidden="true">
                    <path
                      className="profile-subscription-crown-body"
                      d="M1.5 4.5 5.4 8.2 8.8 1.8 12.2 8.2 16.1 4.5 14.7 14.2H2.9L1.5 4.5Z"
                    />
                    <path
                      className="profile-subscription-crown-highlight"
                      d="M4.1 11.8h9.4"
                    />
                  </svg>
                </span>
              )}
              <p className="profile-level">Lv.{user.level}</p>
            </div>

            {onCommentChange ? (
              <button
                type="button"
                className="profile-comment profile-comment--editable"
                aria-label="ひとことを編集"
                onClick={startCommentEdit}
              >
                <p className="profile-comment-text">{displayComment}</p>
              </button>
            ) : (
              <section className="profile-comment" aria-label="ひとこと">
                <p className="profile-comment-text">{displayComment}</p>
              </section>
            )}
          </div>
        </div>

        <div className="profile-records" aria-label="戦績">
          <ProfileRecordRow
            label="CPU戦"
            wins={user.cpuBattleWins}
            losses={user.cpuBattleLosses}
          />
          <ProfileRecordRow
            label="公開デッキ戦"
            wins={user.offlinePvpBattleWins}
            losses={user.offlinePvpBattleLosses}
          />
          <ProfileRecordRow
            label="フレンド対戦"
            wins={user.onlinePvpBattleWins}
            losses={user.onlinePvpBattleLosses}
          />
          <ProfileRecordRow label="真剣勝負！" wins={0} losses={0} />
        </div>

        <section className="profile-decks" aria-labelledby="profile-decks-title">
          <div className="profile-decks-heading">
            <h2 id="profile-decks-title">公開デッキ</h2>
          </div>

          {publishedDecks.length === 0 ? (
            <p className="profile-decks-empty">
              公開中のデッキはありません
            </p>
          ) : (
            <ul className="profile-deck-list">
              {publishedDecks.map((deck) => {
                const rarityThumbs = deck.cards.slice(0, 5).map((card) => {
                  const rarityMeta = getRarityMeta(card.rarity);
                  return (
                    <div
                      key={card.id}
                      className="profile-deck-thumbnail"
                      style={
                        {
                          '--rarity-border': rarityMeta.rowBorder,
                          '--rarity-bg': rarityMeta.rowBg,
                        } as CSSProperties
                      }
                      aria-hidden
                    >
                      <CardPreview pixels={card.pixels} />
                    </div>
                  );
                });
                return (
                  <li key={deck.slotIndex}>
                    <button
                      type="button"
                      className="profile-deck-row"
                      aria-label={`${deck.name}の詳細を開く`}
                      onClick={() =>
                        setSelectedGhost(
                          toPublicGhostDeck(deck, user, ownerId),
                        )
                      }
                    >
                      <span className="profile-deck-name">{deck.name}</span>
                      <div
                        className="profile-deck-thumbnails"
                        aria-hidden
                      >
                        {rarityThumbs}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      )}

      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          戻る
        </button>
      </div>

      {commentEditing && onCommentChange && (
        <ProfileCommentEditModal
          initialValue={user.profileComment ?? ''}
          onSave={saveComment}
          onClose={() => setCommentEditing(false)}
        />
      )}

      {selectedGhost && (
        <OfflinePvpDeckDetailOverlay
          ghost={selectedGhost}
          viewerDeckPower={viewerDeckPower}
          canBattle={canBattle && offlinePvpUnlocked}
          battleBlockedMessage={battleBlockedMessage}
          onClose={() => setSelectedGhost(null)}
          onChallenge={
            onChallengeDeck
              ? (ghost) => {
                  setSelectedGhost(null);
                  onChallengeDeck(ghost);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
