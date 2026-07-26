import { useMemo, useState, type ReactNode } from 'react';
import {
  JEWEL_PACKS,
  SUBSCRIPTION_PLANS,
  UNIVERSAL_SHARD_PACKS,
  formatJewelPackLabel,
  formatShardPackLabel,
  getJewelPackImageFile,
  type JewelPackId,
  type ShopTabId,
  type UniversalShardPackId,
} from '../config/shop';
import { SHOP_TALISMAN_PX } from '../config/economy';
import type {
  ShopPurchaseState,
  UserEconomy,
  UserInventory,
  UserSubscription,
} from '../types';
import {
  canPurchaseUniversalShardPackToday,
  canCancelSubscription,
  describeActiveSubscription,
  getUniversalShardPurchasesToday,
  resolveJewelPackGrantAmount,
  resolveSubscriptionPlanButtonState,
} from '../user/shop';
import { ConfirmDialog } from './ConfirmDialog';
import { getSubscriptionPlanById } from '../config/shop';
import { getActiveSubscriptionPlan } from '../user/subscription';
import { JewelAmount, JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
interface ShopScreenProps {
  economy: UserEconomy;
  inventory: UserInventory;
  shopPurchase: ShopPurchaseState;
  subscription: UserSubscription;
  initialTab?: ShopTabId;
  purchaseMessage: ReactNode | null;
  onPurchaseJewelPack: (packId: JewelPackId) => void;
  onPurchaseTalisman: () => void;
  onPurchaseUniversalShard: (packId: UniversalShardPackId) => void;
  onSubscribe: (plan: 'light' | 'premium') => void;
  onCancelSubscribe: () => void;
  onDismissPurchaseMessage: () => void;
}

const SHOP_TABS: { id: ShopTabId; label: string; ariaLabel?: string }[] = [
  { id: 'jewels', label: '', ariaLabel: 'ジュエル' },
  { id: 'items', label: 'アイテム' },
  { id: 'subscription', label: 'サブスク' },
];

const JEWEL_PACK_PURCHASE_TOAST_RE =
  /^[\d,]+ を獲得しました（\d+円・モック）$/;

export function ShopScreen({
  economy,
  shopPurchase,
  subscription,
  initialTab = 'jewels',
  purchaseMessage,
  onPurchaseJewelPack,
  onPurchaseTalisman,
  onPurchaseUniversalShard,
  onSubscribe,
  onCancelSubscribe,
  onDismissPurchaseMessage,
}: ShopScreenProps) {
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }
  const normalizedPurchase = useMemo(
    () => getUniversalShardPurchasesToday(shopPurchase),
    [shopPurchase],
  );
  const activeSubscriptionLabel = describeActiveSubscription(subscription);
  const showCancelButton = canCancelSubscription(subscription);
  const cancelConfirmExpiresLabel =
    subscription.expiresAt != null
      ? new Date(subscription.expiresAt).toLocaleDateString('ja-JP')
      : '契約満了日';
  const activeSubscriptionPlan = getActiveSubscriptionPlan(subscription);
  const cancelConfirmPlanLabel =
    activeSubscriptionPlan !== 'none'
      ? getSubscriptionPlanById(activeSubscriptionPlan).label
      : '会員プラン';

  return (
    <section className="screen shop-screen">
      <header className="shop-header">
        <h1>ショップ</h1>
        <p className="shop-subtitle muted">
          追加色とお絵描きツールは、カード編集画面で直接購入できます。
        </p>
      </header>

      <div className="shop-tabs" role="tablist" aria-label="ショップカテゴリ">
        {SHOP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id
                ? 'shop-tab shop-tab--active'
                : 'shop-tab'
            }
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.ariaLabel ?? tab.label}
          >
            {tab.id === 'jewels' ? (
              <JewelIcon className="shop-tab-jewel-icon" />
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {purchaseMessage != null && (
        <div className="shop-toast" role="status">
          <p className="shop-toast-message">
            {typeof purchaseMessage === 'string' &&
              JEWEL_PACK_PURCHASE_TOAST_RE.test(purchaseMessage) && (
              <JewelIcon className="shop-toast-jewel-icon" />
            )}
            <span>{purchaseMessage}</span>
          </p>
          <button
            type="button"
            className="shop-toast-dismiss"
            onClick={onDismissPurchaseMessage}
          >
            閉じる
          </button>
        </div>
      )}

      {activeTab === 'jewels' && (
        <div className="shop-panel shop-panel--jewels" role="tabpanel">
          <h2 className="shop-panel-title">ジュエルチャージ</h2>
          <p className="shop-panel-note muted">
            現金購入（モック）。200円パックは初回のみ2倍。
          </p>
          <ul className="shop-product-list shop-product-list--jewels">
            {JEWEL_PACKS.map((pack) => {
              const grant = resolveJewelPackGrantAmount(pack.id, shopPurchase);
              const showFirstBonus =
                pack.firstPurchaseDouble === true &&
                shopPurchase.jewelPack200FirstBonusUsed !== true;
              return (
                <li
                  key={pack.id}
                  className="shop-product-card shop-product-card--jewel-pack"
                >
                  <div className="shop-product-main shop-product-main--jewel-pack">
                    <span className="shop-product-pack-image-wrap">
                      <img
                        className="shop-product-pack-image"
                        src={resolvePublicAssetUrl(getJewelPackImageFile(pack))}
                        alt=""
                        width={64}
                        height={64}
                        draggable={false}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="shop-product-pack-copy">
                      <JewelAmount
                        amount={grant.jewels}
                        className="shop-product-jewel-amount"
                        iconClassName="shop-product-jewel-icon"
                      />
                      <p className="shop-product-detail muted">
                        {formatJewelPackLabel(pack)}
                        {showFirstBonus && (
                          <span className="shop-product-badge">初回2倍</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shop-buy-btn"
                    onClick={() => onPurchaseJewelPack(pack.id)}
                  >
                    {pack.priceYen.toLocaleString()}円
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="shop-panel" role="tabpanel">
          <h2 className="shop-panel-title">アイテム</h2>

          <article className="shop-product-card shop-product-card--item">
            <div className="shop-product-main">
              <div className="shop-item-row">
                <TalismanIcon className="shop-item-icon" />
                <span className="shop-item-label">護符 ×1</span>
              </div>
              <p className="shop-product-detail muted">
                ロスト1回を防ぐ消耗品
              </p>
            </div>
            <button
              type="button"
              className="shop-buy-btn shop-buy-btn--px"
              disabled={economy.freePixels < SHOP_TALISMAN_PX}
              onClick={onPurchaseTalisman}
            >
              <PixelCoinIcon className="shop-buy-coin-icon" aria-hidden />
              {SHOP_TALISMAN_PX.toLocaleString()}
            </button>
          </article>

          <h3 className="shop-subsection-title">汎用かけら</h3>
          <p className="shop-panel-note muted">
            各パックは1日1回まで。毎日 0:00（日本時間）にリセットされます。
          </p>
          <ul className="shop-product-list">
            {UNIVERSAL_SHARD_PACKS.map((pack) => {
              const canBuy = canPurchaseUniversalShardPackToday(
                normalizedPurchase,
                pack.id,
              );
              const soldOut = !canBuy;
              const cannotAfford = economy.freePixels < pack.pixelCost;
              return (
                <li key={pack.id} className="shop-product-card">
                  <div className="shop-product-main">
                    <div className="shop-item-row">
                      <UniversalShardIcon className="shop-item-icon" />
                      <span className="shop-item-label">
                        {formatShardPackLabel(pack)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`shop-buy-btn shop-buy-btn--px${
                      soldOut ? ' shop-buy-btn--sold-out' : ''
                    }`}
                    disabled={soldOut || cannotAfford}
                    onClick={() => onPurchaseUniversalShard(pack.id)}
                    aria-label={
                      soldOut
                        ? `${formatShardPackLabel(pack)} 売り切れ`
                        : undefined
                    }
                  >
                    {soldOut ? (
                      '売り切れ'
                    ) : (
                      <>
                        <PixelCoinIcon className="shop-buy-coin-icon" aria-hidden />
                        {pack.pixelCost.toLocaleString()}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="shop-panel" role="tabpanel">
          <h2 className="shop-panel-title">会員プラン</h2>
          {activeSubscriptionLabel != null && (
            <p className="shop-active-plan">{activeSubscriptionLabel}</p>
          )}
          {showCancelButton && (
            <div className="shop-subscription-cancel-row">
              <button
                type="button"
                className="shop-subscription-cancel-btn"
                onClick={() => setCancelConfirmOpen(true)}
              >
                解約する（モック）
              </button>
            </div>
          )}
          <p className="shop-panel-note muted">
            月額（モック）。加入即時付与＋30日ごとに再付与。プランは同時に1つのみ。
            ライト→プレへのアップグレードは残り期間に応じた日割り差額（次回更新以降800円/月）。
          </p>
          <ul className="shop-product-list shop-product-list--plans">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const buttonState = resolveSubscriptionPlanButtonState(
                subscription,
                plan.id,
              );
              const isDisabled =
                buttonState.kind === 'active' ||
                buttonState.kind === 'unavailable';
              const buttonPriceLabel =
                buttonState.kind === 'join'
                  ? `${buttonState.priceYen.toLocaleString()}円`
                  : buttonState.kind === 'upgrade'
                    ? `差額${buttonState.priceYen.toLocaleString()}円（残り${buttonState.remainingDays}日分）`
                    : null;

              return (
              <li key={plan.id} className="shop-plan-card">
                <div className="shop-plan-header">
                  <h3 className="shop-plan-title">{plan.label}</h3>
                  <p className="shop-plan-price">
                    {plan.priceYen.toLocaleString()}円/月
                  </p>
                </div>
                <p className="shop-plan-description muted">{plan.description}</p>
                <p className="shop-plan-grants">
                  <span className="shop-plan-grant-label">毎月一括受取報酬</span>
                  <span className="shop-plan-grant-amounts">
                    <span className="shop-plan-grant-item">
                      <PixelCoinIcon className="shop-plan-grant-icon" aria-hidden />
                      {plan.monthlyPixels.toLocaleString()}
                    </span>
                    <span className="shop-plan-grant-item">
                      <JewelIcon className="shop-plan-grant-icon" aria-hidden />
                      {plan.monthlyJewels.toLocaleString()}
                    </span>
                    <span className="shop-plan-grant-item">
                      <TalismanIcon className="shop-plan-grant-icon" aria-hidden />
                      {plan.monthlyTalismans}
                    </span>
                  </span>
                </p>
                <button
                  type="button"
                  className="shop-buy-btn shop-buy-btn--plan"
                  disabled={isDisabled}
                  onClick={() => onSubscribe(plan.id)}
                >
                  {buttonState.buttonLabel}
                  {buttonPriceLabel != null && (
                    <span className="shop-plan-btn-price">{buttonPriceLabel}</span>
                  )}
                </button>
              </li>
              );
            })}
          </ul>
          <ConfirmDialog
            open={cancelConfirmOpen}
            className="shop-subscription-cancel-dialog"
            title="サブスクを解約しますか？"
            message={
              <>
                {cancelConfirmExpiresLabel}まで{cancelConfirmPlanLabel}
                の特典はそのままご利用いただけます。
                <br />
                以降は自動更新されません（モック）。
              </>
            }
            confirmLabel="解約する"
            cancelLabel="戻る"
            confirmVariant="danger"
            onConfirm={() => {
              setCancelConfirmOpen(false);
              onCancelSubscribe();
            }}
            onCancel={() => setCancelConfirmOpen(false)}
          />
        </div>
      )}
    </section>
  );
}
