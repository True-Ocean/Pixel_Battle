# 経済・課金・広告 — 実装ロードマップ

**作成日**: 2026-06-14  
**ステータス**: 設計合意（議論ベース）・段階実装の指針  
**関連**: [ECONOMY_SPEC.md](./ECONOMY_SPEC.md)（旧 §10 ポーション/溶解モデルは本書で置き換え）、[PROTOTYPE_DEVELOPMENT_SPEC.md](./PROTOTYPE_DEVELOPMENT_SPEC.md) §5.9

本書は、2026-06 時点の設計議論を **実装順序つき** に整理したロードマップである。  
`ECONOMY_SPEC.md` の全面改訂は **フェーズ 0** で行い、以降のフェーズは本書を正とする。

---

## 1. 設計の確定事項（サマリ）

### 1.1 通貨・資源の三分法

| 表示 | 内部名（案） | 入手 | 主な用途 |
|------|--------------|------|----------|
| ピクセルコイン | `freePixels` | バトル、レベルアップ、**カード削除返還**、勝利2倍広告 | 復活/降格復活、護符購入（px 枠）、**リネーム初回**、編集時キャンバス拡大 |
| 💎 ジュエル | `jewels` | 課金、**毎レベル少量**、L≡4 (mod 5) ボーナス | 削除・リネーム（2回目以降）・デッキ3以降・限界突破レア昇格・創作拡張の **その場消費** |
| 属性かけら | `limitBreakShards[attribute]` | **勝利時の戦利品選択** | 同一属性カードの限界突破（**10個で1回**） |
| 汎用かけら | `limitBreakUniversal` | **Lv20, 30, 40…** | 任意属性のかけらとして消費（属性かけらと同価値） |
| 護符 | `inventory.talisman` | **Lv5 到達（初回 ×1）**、ショップ（px/💎）、サブスク | ロスト1回免れ（装備消費） |

**採用しないもの（旧仕様から廃止）**

- 復活ポーション・溶解リキッド・リネームチケット・デッキ解放キー等の **中間 consumable 商品名**
- 有償ピクセル（ジュエルに統合）
- Lv10 の汎用かけら配布（→ デッキ2解放に差し替え）

**UI 原則**

- 💎 が必要な操作には **💎 アイコン＋数値** をボタン/確認に表示
- px 操作には px アイコンのみ
- 限界突破は **マイデッキ詳細** にのみ表示（§16.9）。所持数は **所持品タブ**

### 1.2 復活・削除（プロトタイプ現行値）

| 操作 | 支払い | 備考 |
|------|--------|------|
| **復活** | px（カードごと） | `floor(塗り×3×レア倍率×★倍率)`。塗り0は最低1px |
| **降格復活** | px（カードごと） | 同上。傾斜は **復活後レア**＋**現★**（R/SR のみ） |
| **カード削除** | **💎 1** | active / lost **共通** |
| **削除返還** | px ＋ 属性かけら | px は `calcGraveyardPixelReward`（勝利戦利品と同式）。かけら N=1/R=2/SR=3 |

レア・★倍率は `LOST_WEIGHT_RARITY` / `LOST_WEIGHT_STARS` を流用（`economy.ts`）。

### 1.3 デッキ解放

| スロット | 条件 |
|----------|------|
| デッキ1 | 初期（`DECK_SLOT_INITIAL_UNLOCKED = 1`） |
| デッキ2 | **ユーザーレベル ≥ 10**（到達時に自動解放＋告知） |
| デッキ3〜5 | **💎 消費**（Lv10 未到達では不可。順番に解放） |

### 1.4 レベルアップ報酬（5n+m の変更点）

| 条件 | 報酬 |
|------|------|
| **毎レベル** | 無償 px（現行 500）＋ **💎 少量**（TBD） |
| L ≡ 4 (mod 5), L ≥ 5 | **💎 ボーナス**（旧「ショップ試供品」枠の置き換え） |
| **Lv10** | **デッキ2 解放**（汎用かけらは **配布しない**） |
| **L ≡ 0 (mod 10), L ≥ 20** | **汎用かけら ×10**（Lv20 から開始。20, 30, 40, 50…） |
| その他 mod 5 | 色・属性・ツール・キャンバス（現行 §5.9 どおり） |

### 1.5 限界突破

| 項目 | 内容 |
|------|------|
| 実行コスト | **かけら合計10個**（専用＋汎用、**1:1**・内訳選択可）（px・💎不可） |
| 戦利品 | 相手墓地1枚選択時: **px（現行式）＋ 選択カード属性のかけら**（N=1, R=2, SR=3） |
| BP | **基礎BP × 3%/回** を均等加算（★アップ・レア昇格で同量。`LIMIT_BREAK_BP_GAIN_RATE`） |
| 対象 | 所持カードと **同一属性** の専用かけら ＋ 任意属性の汎用かけら |
| mechanics | §9.3 既存（★1→3、4回目でレア up） |

### 1.6 広告

| 種別 | 条件 | 備考 |
|------|------|------|
| **創作ゲート** | 初回 **バトル可能デッキ完成後**、作成保存・編集保存のたび | 完成前（`hasEverCompletedBattleDeck` false）は無広告 |
| **バトル回数** | 非会員: **1日10戦まで** 無料、以降は **1戦ごとにリワード広告** | 日次リセット（TZ TBD） |
| **勝利2倍** | **任意**リワード広告 | **px のみ2倍**（かけらは2倍にしない） |
| **履歴再戦** | 再戦フロー開始時（ルール後・デッキ選択前） | **3回に1回**モック広告（`historyRematchStarts`） |
| **会員** | ライト: 軽減 / プレミアム: 広告非表示 | 詳細 TBD |

### 1.7 ショップ・サブスク（役割）

**ショップの主役**

- 💎 チャージ（現金・モック）
- 護符（px または 💎）
- 追加描画ツール・色パレット（💎 永久解放）
- 会員プラン（月額 / 年額）

**ショップに並べない（操作地点で 💎 直消費）**

- カード削除、カード名変更、デッキ3以降解放

---

## 2. 現状（2026-06-17 時点・リネーム・広告一部反映後）

| 領域 | 状態 |
|------|------|
| Lost / 復活 / 降格復活 / 削除返還 | ✅ プロトタイプ実装済み（`economy.ts`, `status.ts`, デッキ UI） |
| **復活 px（塗り式）** | ✅ `calcFullReviveCost(card)` / `calcDowngradeReviveCost(card)` |
| **削除（💎＋返還）** | ✅ `JEWEL_COST_DELETE=1`、`calcLostCardDeleteRewards`、二段階確認 UI |
| **リネーム** | ✅ 初回 **100px**（`PIXEL_COST_RENAME_FIRST`）、2回目以降 **💎1**（`CardRenameDialog`・エディタ） |
| **編集時キャンバス拡大** | ✅ 拡大のみ・px 消費（`calcCanvasUpgradeCost` = 新²−旧²） |
| 勝利 px・墓地選択 UI・属性かけら付与 | ✅ `GraveyardPickModal`, `calcGraveyardShardReward`（N=1/R=2/SR=3） |
| **勝利2倍広告（px）** | ✅ `GraveyardPickModal` → `MockRewardAdModal`（かけらは非対象） |
| バトル中・戦利品のレア表示 | ✅ `BattleUnit.rarity` 連携、`BattleCard` 枠色 |
| `UserEconomy` | ✅ `freePixels` + `jewels`（フェーズ2） |
| インベントリ（護符・かけら） | ✅ `InventoryScreen`、schema v2 |
| デッキ2 Lv10 解放 | ✅ レベルアップ時自動解放（フェーズ2） |
| ヘッダー 💎 表示 | ✅ フェーズ2 |
| 限界突破 gameplay | ✅ マイデッキ詳細 UI・かけら消費・★/レア昇格・均等BP加算（フェーズ6） |
| **限界突破レア昇格 💎** | ✅ 4回目（レア up）時に追加 💎（N=10/R=20/SR=40） |
| Lv20+ 汎用かけら配布 | ✅ `calcLevelUpUniversalLimitBreak`（**×10**/回。フェーズ6） |
| バトル履歴・履歴再戦 | ✅ `RecordsScreen`・`BattleHistoryList`・再戦フロー・生存 px のみ報酬 |
| 履歴再戦モック広告 | ✅ 3回に1回（`MockRewardAdModal`, `adState.historyRematchStarts`） |
| **通常戦モック広告** | ✅ Lv5+・3回に1回（`normalBattleStarts`。仕様 §11.3 の日次10戦 cap とは **別の暫定実装**） |
| **編集前モック広告** | ⚠️ 部分 — デッキ詳細→編集（`returnToDetail`）時のみ。§11.2 の保存時ゲート・`hasEverCompletedBattleDeck` は未接続 |
| レベルアップ UI | ✅ px 数値→アイコン、L≡4 💎 は「3・更に10」分離表示 |
| デッキ選択 UI | ✅ 常時2行ヒント、通常戦の黄色注意削除 |
| ヘッダーメニュー | ✅ 三本線を `user-profile-bar` 内に配置 |
| 開発メニュー | ✅ 設定画面 — 「すべてのかけらを100個にする」 |
| 広告（創作保存・日次 cap） | ❌ `hasEverCompletedBattleDeck` 未使用、`battlesToday` cap 未接続 |
| ショップ画面 | ❌ プレースホルダ |
| デッキ3〜 💎 解放 | ❌ フェーズ3 未着手（モーダルにコスト表示のみ・DEV 順次解放可） |
| 💎 不足→ショップ誘導 | ❌ 文言のみ（フェーズ8 と連動予定） |

---

## 3. 実装フェーズ（ステップバイステップ）

各フェーズは **単独でマージ可能な単位** を目指す。依存関係は §4 参照。

### フェーズ 0 — 仕様書の同期

**目的**: コード着手前にドキュメントを新モデルに揃え、旧 E2（ポーション/溶解）との混同を防ぐ。

**作業**

1. ~~`ECONOMY_SPEC.md` を更新~~ — **2026-06-14 完了**（v1.3）
2. ~~`PROTOTYPE_DEVELOPMENT_SPEC.md` §5.9 / §6.1 を更新~~ — **2026-06-14 完了**
3. 本書（`ECONOMY_ROADMAP.md`）を README または ECONOMY_SPEC 冒頭からリンク — **ECONOMY_SPEC §1.2 でリンク済み**

**完了条件**: 設計レビュー可能な spec が一貫していること。

---

### フェーズ 1 — データモデルと定数

**目的**: 以降の全機能の土台。

**作業**

1. `src/types/index.ts` — `UserEconomy` 拡張
   ```typescript
   interface UserEconomy {
     freePixels: number;
     jewels: number;
   }
   interface UserInventory {
     talisman: number;
     limitBreakUniversal: number;
     limitBreakShards: Partial<Record<Attribute, number>>;
   }
   interface AdState {
     hasEverCompletedBattleDeck: boolean;
     battlesToday: number;
     battlesDayKey: string; // "YYYY-MM-DD"（JST）
     creativeAdCounter?: number; // ライト用
     normalBattleStarts?: number; // 通常戦 3回に1回広告
     historyRematchStarts?: number;
     historyRematchRulesDismissedDayKey?: string;
   }
   ```
2. `SaveData` に `inventory?`, `adState?` を追加
3. `src/user/economy.ts` — `addJewels`, `spendJewels`, 正規化
4. `src/config/economy.ts` — 新定数（TBD 初期値）
   - `JEWELS_PER_LEVEL`, `JEWELS_BONUS_MOD4`, `JEWEL_COST_DELETE`, `JEWEL_COST_RENAME`, `JEWEL_COST_DECK_UNLOCK`
   - `LIMIT_BREAK_SHARDS_REQUIRED`（= 10）、`LIMIT_BREAK_BP_GAIN_RATE`（= 0.03）
   - `GRAVEYARD_SHARD_REWARD`（N=1, R=2, SR=3）、`BATTLE_DAILY_FREE_LIMIT`（= 10）
5. `schemaVersion` マイグレーション（既存セーブ: jewels=0, 空インベントリ）
6. Lv10 以上 & `unlockedDeckCount < 2` のセーブ補正

**完了条件**: テストで economy / inventory の read-write が通る。UI 変更なしでも可。

---

### フェーズ 2 — ヘッダー表示とレベルアップ報酬

**目的**: プレイヤーが 💎 を認識できるようにする。Lv10 デッキ2 を実装。

**作業**

1. ヘッダー（または共通 HUD）に **px | 💎** 表示
2. `progressionUnlocks.ts`
   - Lv10: `kind: 'deck_unlock'`（`limit_break` を Lv20 以降へ移動）
   - 毎レベル: `jewels` 報酬エントリ追加
   - L≡4: `jewels` ボーナス（`shop_sample` 廃止）
3. `App.tsx` / `recordUserBattleOutcome` 経路でレベルアップ時に `jewels` 付与
4. Lv10 到達時: `unlockedDeckCount = max(2, current)` ＋ モーダル/トースト
5. `DeckUnlockModal`: スロット2「Lv10で解放」、3以降「💎 ○」

**完了条件**: レベルアップで px＋💎 が増え、Lv10 でデッキ2タブが使える。

---

### フェーズ 2b — 初心者保護（Lost 解禁・初回護符）

**目的**: Lv1〜4 は敗北してもロストさせず、Lv5 到達と同時に Lost を解禁して護符を1個渡す。

**参照**: [ECONOMY_SPEC §4.2.1](./ECONOMY_SPEC.md#421-初心者保護ユーザーレベル--5)、§7.3、§10.4、§16.8

**作業**

1. `src/config/economy.ts` — `LOST_MIN_USER_LEVEL`, `TALISMAN_STARTER_GRANT_LEVEL`, `TALISMAN_STARTER_GRANT_COUNT`
2. `handleBattleOutcome` / `finalizeBattleOutcome` — ユーザーレベル &lt; 5 の敗北では `LostRoulette` をスキップ
3. レベルアップ処理 — Lv5 到達時に `inventory.talisman += 1`（生涯1回）＋ Lost 解禁告知 UI
4. 練習戦も同様に Lv5 未満はロストなし

**完了条件**: Lv4 以下で敗北してもカードが `lost` にならない。Lv5 到達で護符1個と告知が出る。Lv5 以降は通常ロスト。

---

### フェーズ 3 — デッキ3以降の 💎 解放

**目的**: 有償枠のデッキ拡張。

**作業**

1. `DeckUnlockModal` — 次スロット解放で 💎 消費確認
2. `App.tsx` — `unlockDeckWithJewels()`（Lv10 未満 / 順序外は拒否）
3. DEV メニューは従来どおり上書き可能

**完了条件**: Lv10 以上で 💎 を消費してデッキ3が開く（モックで jewels 付与可）。

---

### フェーズ 4 — 💎 消費（削除・リネーム）

**目的**: 創作まわりの有償ゲート（広告とは別軸）。

**作業**

1. ~~**カード削除**（active / lost 共通）— 💎1 消費、px・かけら返還、二段階確認~~ — **✅ 2026-06-17 完了**
2. ~~**カード名変更**~~ — **✅ 2026-06-17 完了** — 新規作成の命名は無料。リネーム初回 **100px**、2回目以降 **💎1**（`renameCount`）
3. 不足時: 「💎 / px が足りません」→ ショップへ（フェーズ 8 まで準備中リンク）

**完了条件**: 削除・リネームが動作。テスト追加。（**ショップ誘導のみ未完了**）

---

### フェーズ 5 — 勝利戦利品と属性かけら

**目的**: 限界突破のメイン F2P ルート。

**作業**

1. `calcGraveyardShardReward(card)` — **N=1, R=2, SR=3**（`GRAVEYARD_SHARD_REWARD`）
2. `GraveyardPickModal` — 各カードに **属性かけら** 表示、確定文言を px＋かけらに
3. `finalizeBattleOutcome` — 選択カードの属性に `limitBreakShards[attr] += n`
4. **所持品タブ**（`InventoryScreen`）— 汎用＋全属性かけらの所持数一覧

**完了条件**: 勝利→墓地選択→かけらが増える。所持品で確認できる。（**2倍広告は 2026-06-17 に px のみ実装済み**）

---

### フェーズ 6 — 限界突破 UI

**目的**: 属性かけら・汎用かけらを消費して ★ を上げる。

**作業**

1. `src/card/limitBreak.ts` — 実行ロジック（★上限、4回目レア up、SR★3 上限、均等BP加算）
2. `DeckCardDetailOverlay` — 突破可能時のみ左右2列ステッパー＋「限界突破」（§16.9）
3. Lv20 到達時の汎用かけら配布（`profile.ts` / `inventory` 加算）
4. `progressionUnlocks` Lv20+ の `limit_break`（`pending` なし）
5. 設定 **開発メニュー** — 「すべてのかけらを100個にする」（`fillAllLimitBreakShards`）
6. ~~**レア昇格時の追加 💎**~~ — **✅ プロトタイプ追加** — `LIMIT_BREAK_RARITY_JEWEL_COST`（N=10/R=20/SR=40）

**完了条件**: かけら10（専用+汎用の組み合わせ・内訳選択可）で★+1が動く。各段階でBPが均等加算される。レア昇格時はかけら10＋💎。

---

### フェーズ 7 — 広告（モック → SDK）

**目的**: 創作ゲート・バトル cap・2倍報酬。

**サブステップ 7a — モック**

1. `src/ad/` — `showRewardedAd(): Promise<'completed'|'skipped'|'failed'>` モック（2秒待ち等）
2. **創作**: `hasEverCompletedBattleDeck` 判定、保存前にモック広告
3. **バトル cap**: 開始前チェック、11戦目以降は広告後に `battlesToday++`
4. ~~**2倍**: 勝利モーダルに「広告で px 2倍」、かけらは対象外~~ — **✅ 2026-06-17 完了**（`GraveyardPickModal`）
5. 日次リセット `battlesDayKey`（`battlesToday` は型・正規化のみ。**cap 判定は未接続**）
6. ~~**履歴再戦**: 3回に1回、ルールモーダル後にモック広告~~ — **2026-06-16 完了**（`MockRewardAdModal`, `historyRematch.ts`）
7. ~~**通常戦**: Lv5+ で3回に1回、バトル開始前モック広告~~ — **✅ プロトタイプ暫定**（本仕様 §11.3 の **1日10戦 cap とは別**。`shouldRequireNormalBattleAd`）
8. **編集前広告（暫定）**: デッキ詳細→編集（`returnToDetail`）のみ `MockRewardAdModal`。§11.2 の保存時・`hasEverCompletedBattleDeck` は **未着手**

**完了条件**: モックで本仕様の広告フローが end-to-end で通る。（**2倍・履歴再戦・通常戦3回に1回は ✅。創作保存ゲート・日次10戦 cap は未着手**）

**サブステップ 7b — 本番 SDK**（環境依存・後回し可）

- AdMob 等のリワード API に `showRewardedAd` を差し替え

---

### フェーズ 8 — ショップ（ローカル / モック課金）

**目的**: 💎 チャージと拡張コンテンツの棚。

**作業**

1. `PlaceholderScreen` → `ShopScreen`
2. カテゴリ: 💎 パック（モック購入）、護符、ツール/パレット解放
3. 護符: px 優先価格（TBD）、装備 UI は §7 参照
4. 創作拡張: `editorTools.ts` / `paletteUnlock.ts` と連動した **💎 永久解放** フラグ（セーブ）
5. 💎 不足時の deep link（削除・デッキ解放から遷移）

**完了条件**: モックで jewels 購入→削除等で消費のループが完結。

---

### フェーズ 9 — サブスク（モック）

**目的**: 会員特典の骨格。

**作業**

1. `SaveData.subscription` — `plan`, `expiresAt`
2. 特典: 広告軽減/非表示、月次 💎＋護符付与（モック付与ボタン）
3. 設定画面にプラン表示・開発用切替

**完了条件**: プレミアム ON で創作/バトル/2倍広告がスキップされる。

---

### フェーズ 10 — レア抽選・創作ボonus（旧 E5）

**目的**: 新規作成時の N/R/SR（ECONOMY §9.2）。経済ループと独立しうるが、限界突破・戦利品のレア倍率前に推奨。

**参照**: `ECONOMY_SPEC.md` §9.2、`createCardFromDrawing`

---

### フェーズ 11 — 将来

| 項目 | 備考 |
|------|------|
| 対人戦 | 勝利戦利品・かけらルールを §13 に合わせる |
| ストア課金本番 | App Store / Google Play |
| UR / Legend | §14.3 |
| アルバム・補欠枠 | §14 |

---

## 4. フェーズ依存関係

```mermaid
flowchart TD
  P0[フェーズ0 仕様同期]
  P1[フェーズ1 データモデル]
  P2[フェーズ2 レベル報酬・Lv10デッキ2]
  P3[フェーズ3 デッキ3💎]
  P4[フェーズ4 削除・リネーム💎]
  P5[フェーズ5 戦利品かけら]
  P6[フェーズ6 限界突破UI]
  P7[フェーズ7 広告]
  P8[フェーズ8 ショップ]
  P9[フェーズ9 サブスク]
  P10[フェーズ10 レア抽選]

  P0 --> P1
  P1 --> P2
  P2 --> P3
  P1 --> P4
  P1 --> P5
  P5 --> P6
  P2 --> P6
  P1 --> P7
  P2 --> P7
  P1 --> P8
  P8 --> P4
  P8 --> P3
  P7 --> P9
  P8 --> P9
  P6 --> P10
```

**推奨着手順（最小のプレイ可能単位）**

1. **0 → 1 → 2** — ジュエル表示・Lv10 デッキ2（体感しやすい）
2. **5 → 6** — バトル→かけら→限界突破（コアループ）
3. **7a** — 広告モック（創作・cap・2倍）
4. **4 → 3 → 8** — 💎 消費とショップ
5. **9 → 7b → 10** — 会員・本番 SDK・レア

---

## 5. 未決定パラメータ（TBD）

実装時に `src/config/economy.ts` へ集約する。初期値は **プロトタイプ用に控えめ** から開始し、DEV メニューで調整可能にすることを推奨。

| キー | 案 | 備考 |
|------|-----|------|
| `JEWELS_PER_LEVEL` | 3 | 毎レベル |
| `JEWELS_BONUS_MOD4` | +10 | L≡4 (mod 5) 追加 |
| `JEWEL_COST_DELETE` | 1 | カード削除（active/lost 共通・プロトタイプ） |
| `PIXEL_COST_RENAME_FIRST` | 100 | リネーム初回（`renameCount=0`） |
| `JEWEL_COST_RENAME` | 1 | リネーム2回目以降（プロトタイプ） |
| `LIMIT_BREAK_RARITY_JEWEL_COST` | N=10, R=20, SR=40 | 限界突破4回目（レア昇格）の追加 💎 |
| `JEWEL_COST_DECK_UNLOCK` | 200 | デッキ3〜各1回 |
| `LIMIT_BREAK_SHARDS_REQUIRED` | 10 | |
| `LIMIT_BREAK_BP_GAIN_RATE` | 0.03 | 限界突破1回のBP加算（基礎BP×率、最低1） |
| `GRAVEYARD_SHARD_REWARD` | N=1, R=2, SR=3 | 戦利品かけら（確定） |
| `BATTLE_DAILY_FREE_LIMIT` | 10 | 非会員 |
| `SHOP_TALISMAN_PX` | 300 | 旧仕様踏襲 |
| `SHOP_TALISMAN_JEWELS` | 25 | 💎 枠（px と両方で購入可） |
| `UNIVERSAL_LIMIT_BREAK_LEVEL_REWARD` | 10 | L≡0 (mod 10), L≥20 |
| `REVIVE_PAINTED_MULTIPLIER` | 3 | 復活 px: 塗り×3 が基礎 |
| `LOST_WEIGHT_RARITY` / `LOST_WEIGHT_STARS` | 表参照 | 復活コストのレア・★傾斜 |
| `MOCK_JEWEL_PACK_SMALL` | 100 | 開発用 |

---

## 6. 主要タッチファイル（実装時チェックリスト）

| フェーズ | ファイル |
|----------|----------|
| 1 | `src/types/index.ts`, `src/user/economy.ts`, `src/storage/index.ts` |
| 2 | `src/config/progressionUnlocks.ts`, `src/App.tsx`, `src/components/DeckUnlockModal.tsx` |
| 4 | `DeckScreen.tsx`, `DeckCardDetailOverlay.tsx`, `CardRenameDialog.tsx`, `EditorScreen.tsx`, `App.tsx` |
| 5 | `src/components/GraveyardPickModal.tsx`, `src/battle/graveyardLoot.ts`, `src/components/InventoryScreen.tsx`, `src/config/economy.ts`, `src/App.tsx` |
| 6 | `src/card/limitBreak.ts`, `DeckCardDetailOverlay.tsx`, `DeckScreen.tsx`, `SettingsScreen.tsx`, `src/user/profile.ts` |
| 7 | 新規 `src/ad/*`, エディタ保存経路, バトル開始経路, `MockRewardAdModal`, `historyRematch.ts`, `HistoryRematchRulesModal` |
| 8 | `src/components/ShopScreen.tsx`（新規）, `App.tsx` routing |

---

## 7. テスト方針

- 各フェーズで **ユニットテスト** を追加（economy, progressionUnlocks, shard grant, jewel spend）
- 広告・課金は **モックアダプタ** を inject し、E2E は「広告完了フラグ」を DEV でシミュレート
- マイグレーション: 旧セーブ JSON の fixture で `normalizeSaveData` を検証

---

## 8. 旧 ECONOMY_SPEC フェーズ表との対応

| 旧 | 新（本ロードマップ） |
|----|----------------------|
| E0 データモデル | フェーズ 1 |
| E1 Lost/勝利/墓地 | ✅ 済（px＋属性かけら。フェーズ5） |
| E2 ポーション/溶解/ショップ | **分割** → フェーズ 3,4,8（ジュエル直消費モデル）。**削除・リネームは ✅ フェーズ4完了** |
| E3 広告 | フェーズ 7（**一部 ✅** — 2倍・履歴再戦・通常戦3回に1回） |
| E4 サブスク | フェーズ 9 |
| E5 レア抽選 | フェーズ 10 |
| E6 限界突破 | ✅ 済（フェーズ 5 + 6） |
| E7 将来 | フェーズ 11 |

---

## 9. 次のアクション

**immediate（推奨）**

1. ~~フェーズ **0** — 仕様書同期~~ — **2026-06-14 完了**
2. ~~フェーズ **1** — `jewels` + `inventory` + `adState` の型とマイグレーション~~ — **2026-06-14 完了**（schema v2）
3. ~~フェーズ **2** — ヘッダー 💎・レベル報酬・Lv10 デッキ2~~ — **2026-06-14 完了**
4. ~~フェーズ **2b** — Lv5 未満ロスト無効・Lv5 到達時護符 ×1~~ — **2026-06-14 完了**
5. ~~フェーズ **5** — 勝利戦利品・属性かけら・戦利品 UI~~ — **2026-06-14 完了**
6. ~~フェーズ **6** — 限界突破 UI~~ — **2026-06-14 完了**
7. ~~履歴再戦・バトル履歴 UI~~ — **2026-06-16 完了**（フェーズ7a の一部）
8. ~~フェーズ **4**（削除）— 💎1・返還・復活コスト塗り式~~ — **2026-06-17 完了**
9. ~~フェーズ **4**（リネーム）— 初回100px・2回目以降💎1~~ — **2026-06-17 完了**
10. ~~フェーズ **7a**（勝利2倍・通常戦3回に1回）~~ — **2026-06-17 完了**（日次 cap は未着手）

**次の推奨**

11. フェーズ **3** ＋ **8** MVP — デッキ3〜 💎 解放とショップ（ジュエルパック・護符・不足時 deep link）
12. フェーズ **7a** 残り — 創作保存ゲート（`hasEverCompletedBattleDeck`）・日次10戦 cap（`battlesToday`）

**判断待ち（確定済み）**

- [x] 新規作成の **命名** は無料。リネームは **初回100px・2回目以降💎1**（`renameCount`）
- [x] レアカード戦利品のかけら: **N=1, R=2, SR=3**
- [x] 護符価格: **px と 💎 の両方**（300px / 25💎）
- [x] 日次リセットのタイムゾーン（**JST 固定**）
- [x] 限界突破 UI: かけら不足時は非表示、専用・汎用をステッパーで内訳選択
- [x] 限界突破 BP: **基礎BP×3%/回** の均等加算（レア昇格でも減少しない）
- [x] 汎用かけらは専用かけらと **1:1 同価値**（10個で1回、組み合わせ可）

---

*本書は実装の進行に応じてフェーズ完了チェックと TBD 確定値を更新すること。*
