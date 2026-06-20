import { useMemo, useState } from 'react';
import {
  JEWEL_PACKS,
  SUBSCRIPTION_PLANS,
  UNIVERSAL_SHARD_PACKS,
  formatJewelPackLabel,
  formatShardPackLabel,
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
  describeActiveSubscription,
  getUniversalShardPurchasesToday,
  resolveJewelPackGrantAmount,
  resolveSubscriptionPlanButtonState,
} from '../user/shop';
import { JewelAmount, JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

interface ShopScreenProps {
  economy: UserEconomy;
  inventory: UserInventory;
  shopPurchase: ShopPurchaseState;
  subscription: UserSubscription;
  purchaseMessage: string | null;
  onPurchaseJewelPack: (packId: JewelPackId) => void;
  onPurchaseTalisman: () => void;
  onPurchaseUniversalShard: (packId: UniversalShardPackId) => void;
  onSubscribe: (plan: 'light' | 'premium') => void;
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
  inventory: _inventory,
  shopPurchase,
  subscription,
  purchaseMessage,
  onPurchaseJewelPack,
  onPurchaseTalisman,
  onPurchaseUniversalShard,
  onSubscribe,
  onDismissPurchaseMessage,
}: ShopScreenProps) {
  const [activeTab, setActiveTab] = useState<ShopTabId>('jewels');
  const normalizedPurchase = useMemo(
    () => getUniversalShardPurchasesToday(shopPurchase),
    [shopPurchase],
  );
  const activeSubscriptionLabel = describeActiveSubscription(subscription);

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
            {JEWEL_PACK_PURCHASE_TOAST_RE.test(purchaseMessage) && (
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
        <div className="shop-panel" role="tabpanel">
          <h2 className="shop-panel-title">ジュエルチャージ</h2>
          <p className="shop-panel-note muted">
            現金購入（モック）。200円パックは初回のみ2倍。
          </p>
          <ul className="shop-product-list">
            {JEWEL_PACKS.map((pack) => {
              const grant = resolveJewelPackGrantAmount(pack.id, shopPurchase);
              const showFirstBonus =
                pack.firstPurchaseDouble === true &&
                shopPurchase.jewelPack200FirstBonusUsed !== true;
              return (
                <li key={pack.id} className="shop-product-card">
                  <div className="shop-product-main">
                    <JewelAmount
                      amount={grant.jewels}
                      className="shop-product-jewel-amount"
                      iconClassName="shop-product-jewel-icon"
                    />
                    <p className="shop-product-detail muted">
                      {formatJewelPackLabel(pack)}個
                      {showFirstBonus && (
                        <span className="shop-product-badge">初回2倍</span>
                      )}
                    </p>
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
            各パックは1日1回まで（JST 0:00 リセット）。
          </p>
          <ul className="shop-product-list">
            {UNIVERSAL_SHARD_PACKS.map((pack) => {
              const canBuy = canPurchaseUniversalShardPackToday(
                normalizedPurchase,
                pack.id,
              );
              const purchasedToday =
                normalizedPurchase.shopShardPurchasesToday?.[pack.id] ?? 0;
              return (
                <li key={pack.id} className="shop-product-card">
                  <div className="shop-product-main">
                    <div className="shop-item-row">
                      <UniversalShardIcon className="shop-item-icon" />
                      <span className="shop-item-label">
                        {formatShardPackLabel(pack)}個
                      </span>
                    </div>
                    {purchasedToday >= 1 && (
                      <p className="shop-product-detail muted">本日購入済み</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shop-buy-btn shop-buy-btn--px"
                    disabled={!canBuy || economy.freePixels < pack.pixelCost}
                    onClick={() => onPurchaseUniversalShard(pack.id)}
                  >
                    <PixelCoinIcon className="shop-buy-coin-icon" aria-hidden />
                    {pack.pixelCost.toLocaleString()}
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
                <ul className="shop-plan-grants">
                  <li>
                    <PixelCoinIcon className="shop-plan-grant-icon" aria-hidden />
                    {plan.monthlyPixels.toLocaleString()}px / 月
                  </li>
                  <li>
                    <JewelIcon className="shop-plan-grant-icon" aria-hidden />
                    {plan.monthlyJewels.toLocaleString()} / 月
                  </li>
                  <li>
                    <TalismanIcon className="shop-plan-grant-icon" aria-hidden />
                    護符 {plan.monthlyTalismans} / 月
                  </li>
                </ul>
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
        </div>
      )}
    </section>
  );
}
