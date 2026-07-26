import { useMemo, useState, type ReactNode } from 'react';
import {
  JEWEL_PACKS,
  SUBSCRIPTION_PLANS,
  TALISMAN_PACKS,
  UNIVERSAL_SHARD_PACKS,
  formatJewelPackLabel,
  formatShardPackLabel,
  formatTalismanPackLabel,
  getJewelPackImageFile,
  type JewelPackId,
  type ShopTabId,
  type TalismanPackId,
  type UniversalShardPackId,
} from '../config/shop';
import {
  ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL,
  ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO,
  UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO,
} from '../config/economy';
import { ATTRIBUTE_META, getAttributeMeta } from '../config/attributes';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import type { HelpTopic } from '../config/helpContent';
import type {
  Attribute,
  ShopPurchaseState,
  UserEconomy,
  UserInventory,
  UserSubscription,
} from '../types';
import {
  canCancelSubscription,
  describeActiveSubscription,
  resolveJewelPackGrantAmount,
  resolveSubscriptionPlanButtonState,
} from '../user/shop';
import {
  calcAttributeMeltOutcome,
  calcUniversalCostForAttributeShards,
} from '../user/shardExchange';
import { AttributeBadge } from './AttributeBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { getSubscriptionPlanById } from '../config/shop';
import { getActiveSubscriptionPlan } from '../user/subscription';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';
import { InlinePxCost } from './HelpInlineEconomy';
import { JewelAmount, JewelIcon } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { TalismanIcon } from './TalismanIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

type ShardExchangeMode = 'universalToAttribute' | 'attributeToUniversal';

const SHARD_EXCHANGE_HELP: HelpTopic = {
  title: 'かけら交換',
  sections: [
    {
      items: [
        `汎用 ${UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO} 個で、解放済み属性のかけら 1 個に交換できます。`,
        `属性かけら 1 個を汎用 ${ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO} 個に交換できます。手数料は得た汎用 1 個あたり ${ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL}px です。`,
        '日次上限はありません。限界突破に使えるのは属性かけらのみです。',
      ],
    },
  ],
};

interface ShopScreenProps {
  economy: UserEconomy;
  inventory: UserInventory;
  shopPurchase: ShopPurchaseState;
  subscription: UserSubscription;
  userLevel: number;
  initialTab?: ShopTabId;
  purchaseMessage: ReactNode | null;
  onPurchaseJewelPack: (packId: JewelPackId) => void;
  onPurchaseTalismanPack: (packId: TalismanPackId) => void;
  onPurchaseUniversalShard: (packId: UniversalShardPackId) => void;
  onExchangeUniversalToAttribute: (
    attribute: Attribute,
    attributeAmount: number,
  ) => void;
  onMeltAttributeToUniversal: (
    attribute: Attribute,
    attributeAmount: number,
  ) => void;
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

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_META) as Attribute[];

export function ShopScreen({
  economy,
  inventory,
  shopPurchase,
  subscription,
  userLevel,
  initialTab = 'jewels',
  purchaseMessage,
  onPurchaseJewelPack,
  onPurchaseTalismanPack,
  onPurchaseUniversalShard,
  onExchangeUniversalToAttribute,
  onMeltAttributeToUniversal,
  onSubscribe,
  onCancelSubscribe,
  onDismissPurchaseMessage,
}: ShopScreenProps) {
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [exchangeHelpOpen, setExchangeHelpOpen] = useState(false);
  const [exchangeMode, setExchangeMode] =
    useState<ShardExchangeMode>('universalToAttribute');
  const unlockedAttributes = useMemo(
    () => getUnlockedAttributes(userLevel),
    [userLevel],
  );
  const [exchangeAttribute, setExchangeAttribute] = useState<Attribute>(
    () => unlockedAttributes[0] ?? 'attack',
  );
  const [exchangeAmount, setExchangeAmount] = useState(1);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const exchangeAttributeOptions =
    exchangeMode === 'universalToAttribute'
      ? unlockedAttributes
      : ALL_ATTRIBUTES.filter(
          (attribute) => (inventory.limitBreakShards[attribute] ?? 0) > 0,
        );

  const exchangeAttributeResetKey = `${exchangeMode}\u0000${exchangeAttributeOptions.join(',')}`;
  const [prevExchangeAttributeResetKey, setPrevExchangeAttributeResetKey] =
    useState(exchangeAttributeResetKey);
  if (exchangeAttributeResetKey !== prevExchangeAttributeResetKey) {
    setPrevExchangeAttributeResetKey(exchangeAttributeResetKey);
    if (
      exchangeAttributeOptions.length > 0 &&
      !exchangeAttributeOptions.includes(exchangeAttribute)
    ) {
      setExchangeAttribute(exchangeAttributeOptions[0]!);
      setExchangeAmount(1);
    }
  }

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

  const selectedAttributeOwned =
    inventory.limitBreakShards[exchangeAttribute] ?? 0;
  const universalOwned = inventory.limitBreakUniversal;
  const maxExchangeAmount =
    exchangeMode === 'universalToAttribute'
      ? Math.floor(universalOwned / UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO)
      : selectedAttributeOwned;
  const clampedExchangeAmount = Math.min(
    Math.max(1, exchangeAmount),
    Math.max(1, maxExchangeAmount || 1),
  );
  const universalCost = calcUniversalCostForAttributeShards(clampedExchangeAmount);
  const meltOutcome = calcAttributeMeltOutcome(clampedExchangeAmount);
  const canExchange =
    maxExchangeAmount > 0 &&
    clampedExchangeAmount >= 1 &&
    clampedExchangeAmount <= maxExchangeAmount &&
    (exchangeMode === 'universalToAttribute'
      ? universalOwned >= universalCost
      : selectedAttributeOwned >= clampedExchangeAmount &&
        economy.freePixels >= meltOutcome.pixelFee);
  const exchangeAttrMeta = getAttributeMeta(exchangeAttribute);

  const adjustExchangeAmount = (delta: number) => {
    if (maxExchangeAmount <= 0) return;
    setExchangeAmount((current) =>
      Math.min(maxExchangeAmount, Math.max(1, current + delta)),
    );
  };

  const handleExchangeConfirm = () => {
    if (!canExchange) return;
    if (exchangeMode === 'universalToAttribute') {
      onExchangeUniversalToAttribute(exchangeAttribute, clampedExchangeAmount);
    } else {
      onMeltAttributeToUniversal(exchangeAttribute, clampedExchangeAmount);
    }
    setExchangeAmount(1);
  };

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
          <section className="shop-item-section" aria-labelledby="shop-talisman-heading">
            <header className="shop-item-section-header">
              <h3 id="shop-talisman-heading" className="shop-item-section-title">
                護符
              </h3>
            </header>
            <div className="shop-item-section-body">
              <p className="shop-panel-note muted">ロスト1回を防ぐ消耗品</p>
              <ul className="shop-pack-row" aria-label="護符パック">
                {TALISMAN_PACKS.map((pack) => {
                  const cannotAfford = economy.freePixels < pack.pixelCost;
                  return (
                    <li key={pack.id} className="shop-pack-tile">
                      <div className="shop-pack-tile-main">
                        <TalismanIcon className="shop-pack-tile-icon shop-pack-tile-icon--talisman" />
                        <span className="shop-pack-tile-label">
                          {formatTalismanPackLabel(pack)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shop-buy-btn shop-buy-btn--px shop-buy-btn--pack"
                        disabled={cannotAfford}
                        onClick={() => onPurchaseTalismanPack(pack.id)}
                        aria-label={`護符 ${formatTalismanPackLabel(pack)} ${pack.pixelCost.toLocaleString()}ピクセル`}
                      >
                        <PixelCoinIcon className="shop-buy-coin-icon" aria-hidden />
                        {pack.pixelCost.toLocaleString()}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="shop-item-section" aria-labelledby="shop-universal-heading">
            <header className="shop-item-section-header">
              <h3 id="shop-universal-heading" className="shop-item-section-title">
                汎用かけら
              </h3>
            </header>
            <div className="shop-item-section-body">
              <p className="shop-panel-note muted">
                属性のかけらへの交換に使います。
              </p>
              <ul className="shop-pack-row" aria-label="汎用かけらパック">
                {UNIVERSAL_SHARD_PACKS.map((pack) => {
                  const cannotAfford = economy.freePixels < pack.pixelCost;
                  return (
                    <li key={pack.id} className="shop-pack-tile">
                      <div className="shop-pack-tile-main">
                        <UniversalShardIcon className="shop-pack-tile-icon" />
                        <span className="shop-pack-tile-label">
                          {formatShardPackLabel(pack)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shop-buy-btn shop-buy-btn--px shop-buy-btn--pack"
                        disabled={cannotAfford}
                        onClick={() => onPurchaseUniversalShard(pack.id)}
                        aria-label={`汎用かけら ${formatShardPackLabel(pack)} ${pack.pixelCost.toLocaleString()}ピクセル`}
                      >
                        <PixelCoinIcon className="shop-buy-coin-icon" aria-hidden />
                        {pack.pixelCost.toLocaleString()}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="shop-item-section" aria-labelledby="shop-exchange-heading">
            <header className="shop-item-section-header shop-item-section-header--with-help">
              <h3 id="shop-exchange-heading" className="shop-item-section-title">
                かけら交換
              </h3>
              <HelpInfoButton
                className="shop-exchange-help-btn"
                ariaLabel="かけら交換について"
                onClick={() => setExchangeHelpOpen(true)}
              />
            </header>
            <div className="shop-item-section-body">
          <div className="shop-exchange-mode" role="tablist" aria-label="交換の向き">
            <button
              type="button"
              role="tab"
              aria-selected={exchangeMode === 'universalToAttribute'}
              className={
                exchangeMode === 'universalToAttribute'
                  ? 'shop-exchange-mode-btn shop-exchange-mode-btn--active'
                  : 'shop-exchange-mode-btn'
              }
              onClick={() => {
                setExchangeMode('universalToAttribute');
                setExchangeAmount(1);
              }}
            >
              汎用→属性
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={exchangeMode === 'attributeToUniversal'}
              className={
                exchangeMode === 'attributeToUniversal'
                  ? 'shop-exchange-mode-btn shop-exchange-mode-btn--active'
                  : 'shop-exchange-mode-btn'
              }
              onClick={() => {
                setExchangeMode('attributeToUniversal');
                setExchangeAmount(1);
              }}
            >
              属性→汎用
            </button>
          </div>

          <article className="shop-exchange-card">
            <div
              className="shop-exchange-attribute-grid"
              role="listbox"
              aria-label="かけらを選択"
            >
              <div
                className="shop-exchange-attribute-option shop-exchange-attribute-option--universal"
                aria-label={`汎用のかけら 所持 ${universalOwned}`}
              >
                <UniversalShardIcon className="shop-exchange-universal-icon" />
                <span className="shop-exchange-attribute-owned">
                  {universalOwned.toLocaleString()}
                </span>
              </div>
              {exchangeAttributeOptions.map((attribute) => {
                const meta = getAttributeMeta(attribute);
                const owned = inventory.limitBreakShards[attribute] ?? 0;
                const selected = attribute === exchangeAttribute;
                return (
                  <button
                    key={attribute}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={`${meta.label}のかけら 所持 ${owned}`}
                    className={
                      selected
                        ? 'shop-exchange-attribute-option shop-exchange-attribute-option--selected'
                        : 'shop-exchange-attribute-option'
                    }
                    onClick={() => {
                      setExchangeAttribute(attribute);
                      setExchangeAmount(1);
                    }}
                  >
                    <AttributeBadge attribute={attribute} size="deck" />
                    <span className="shop-exchange-attribute-owned">
                      {owned.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {exchangeAttributeOptions.length === 0 ? (
              <p className="shop-panel-note muted" role="status">
                {exchangeMode === 'universalToAttribute'
                  ? '交換できる属性がありません。'
                  : '溶かせる属性かけらがありません。'}
              </p>
            ) : (
              <div className="shop-exchange-controls">
                <div className="shop-exchange-stepper">
                  <button
                    type="button"
                    className="shop-exchange-step"
                    aria-label="数量を減らす"
                    disabled={clampedExchangeAmount <= 1 || maxExchangeAmount <= 0}
                    onClick={() => adjustExchangeAmount(-1)}
                  >
                    −
                  </button>
                  <span
                    className="shop-exchange-step-value"
                    aria-label={`交換数量 ${clampedExchangeAmount}`}
                  >
                    {maxExchangeAmount > 0 ? clampedExchangeAmount : 0}
                  </span>
                  <button
                    type="button"
                    className="shop-exchange-step"
                    aria-label="数量を増やす"
                    disabled={
                      maxExchangeAmount <= 0 ||
                      clampedExchangeAmount >= maxExchangeAmount
                    }
                    onClick={() => adjustExchangeAmount(1)}
                  >
                    ＋
                  </button>
                </div>
                <button
                  type="button"
                  className="shop-buy-btn shop-buy-btn--exchange"
                  disabled={!canExchange}
                  onClick={handleExchangeConfirm}
                  aria-label={
                    exchangeMode === 'universalToAttribute'
                      ? `汎用のかけら ${universalCost} を ${exchangeAttrMeta.label}のかけら ${clampedExchangeAmount} に交換する`
                      : `${exchangeAttrMeta.label}のかけら ${clampedExchangeAmount} を汎用のかけら ${meltOutcome.universalGained} に交換する（手数料 ${meltOutcome.pixelFee} ピクセル）`
                  }
                >
                  {exchangeMode === 'universalToAttribute' ? (
                    <span className="shop-exchange-btn-label">
                      <UniversalShardIcon className="shop-exchange-btn-icon" />
                      <span>{universalCost.toLocaleString()}</span>
                      <span>を</span>
                      <AttributeBadge attribute={exchangeAttribute} size="deck" />
                      <span>{clampedExchangeAmount.toLocaleString()}</span>
                      <span>に交換する</span>
                    </span>
                  ) : (
                    <span className="shop-exchange-btn-label">
                      <AttributeBadge attribute={exchangeAttribute} size="deck" />
                      <span>{clampedExchangeAmount.toLocaleString()}</span>
                      <span>を</span>
                      <UniversalShardIcon className="shop-exchange-btn-icon" />
                      <span>{meltOutcome.universalGained.toLocaleString()}</span>
                      <span>に交換する（手数料</span>
                      <InlinePxCost
                        amount={meltOutcome.pixelFee}
                        className="shop-exchange-btn-fee"
                        iconClassName="shop-exchange-btn-fee-icon"
                      />
                      <span>）</span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </article>
            </div>
          </section>
          {exchangeHelpOpen && (
            <HelpPanelModal
              topic={SHARD_EXCHANGE_HELP}
              onClose={() => setExchangeHelpOpen(false)}
            />
          )}
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
