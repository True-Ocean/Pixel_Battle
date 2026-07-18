import { useState, type CSSProperties } from 'react';
import { getSubscriptionPlanById } from '../config/shop';
import { getRarityMeta } from '../config/rarity';
import type { Card, UserProfile, UserSubscription } from '../types';
import { getActiveSubscriptionPlan } from '../user';
import { CardDetailViewOverlay } from './CardDetailViewOverlay';
import { CardPreview } from './CardPreview';
import { PixelIconPreview } from './PixelIconPreview';

export interface ProfileDisplayUser {
  username: string;
  avatar?: UserProfile['avatar'];
  level: number;
  cpuBattleWins: number | null;
  cpuBattleLosses: number | null;
  offlinePvpBattleWins: number | null;
  offlinePvpBattleLosses: number | null;
  onlinePvpBattleWins: number | null;
  onlinePvpBattleLosses: number | null;
}

export interface ProfilePublishedDeck {
  slotIndex: number;
  name: string;
  cards: Card[];
}

export interface ProfileScreenProps {
  user: ProfileDisplayUser;
  /** 他ユーザー閲覧時は省略し、プランを表示しない。 */
  subscription?: UserSubscription;
  publishedDecks: readonly ProfilePublishedDeck[];
  loadError?: boolean;
  onRetry?: () => void;
  onBack: () => void;
  onOpenAvatar: () => void;
}

const AVATAR_PREVIEW_SIZE = 96;

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
  loadError = false,
  onRetry,
  onBack,
  onOpenAvatar,
}: ProfileScreenProps) {
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const activePlan = subscription
    ? getActiveSubscriptionPlan(subscription)
    : 'none';
  const planLabel =
    activePlan === 'none' ? null : getSubscriptionPlanById(activePlan).label;
  const trimmedName = user.username.trim();
  const initialChar = trimmedName.charAt(0) || '?';

  return (
    <section className="screen profile-screen">
      <header className="profile-header">
        <button type="button" className="profile-back-btn" onClick={onBack}>
          戻る
        </button>
        <h1 className="profile-title">プロフィール</h1>
      </header>

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

        <button
          type="button"
          className="profile-avatar-frame"
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

        <div className="profile-identity">
          <p className="profile-name">{user.username}</p>
          <p className="profile-level">Lv.{user.level}</p>
          {planLabel != null && (
            <p className={`profile-plan profile-plan--${activePlan}`}>
              {planLabel}
            </p>
          )}
        </div>

        <div className="profile-records" aria-label="戦績">
          <ProfileRecordRow
            label="CPU戦"
            wins={user.cpuBattleWins}
            losses={user.cpuBattleLosses}
          />
          <ProfileRecordRow
            label="対人戦（オフライン）"
            wins={user.offlinePvpBattleWins}
            losses={user.offlinePvpBattleLosses}
          />
          <ProfileRecordRow
            label="フレンド対戦（オンライン）"
            wins={user.onlinePvpBattleWins}
            losses={user.onlinePvpBattleLosses}
          />
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
              {publishedDecks.map((deck) => (
                <li key={deck.slotIndex} className="profile-deck-row">
                  <span className="profile-deck-name">{deck.name}</span>
                  <div
                    className="profile-deck-thumbnails"
                    aria-label={`${deck.name}のカード`}
                  >
                    {deck.cards.slice(0, 5).map((card) => {
                      const rarityMeta = getRarityMeta(card.rarity);
                      return (
                        <button
                          key={card.id}
                          type="button"
                          className="profile-deck-thumbnail"
                          style={
                            {
                              '--rarity-border': rarityMeta.rowBorder,
                              '--rarity-bg': rarityMeta.rowBg,
                            } as CSSProperties
                          }
                          aria-label={`${card.name}の詳細を開く`}
                          onClick={() => setDetailCard(card)}
                        >
                          <CardPreview pixels={card.pixels} />
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {detailCard && (
        <CardDetailViewOverlay
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      )}
    </section>
  );
}
