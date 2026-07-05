# 簡単！真剣！お絵描きピクセルバトル！ — オフライン対人戦 実装仕様書

| 項目 | 内容 |
|------|------|
| ドキュメント版 | 1.7 |
| 最終更新 | 2026-07-05 |
| 対象 | ウェブプロトタイプ（React + Vite + TypeScript） |
| 関連 | [経済仕様 §13](./ECONOMY_SPEC.md#13-対人戦将来) / [プロトタイプ開発指示書](./PROTOTYPE_DEVELOPMENT_SPEC.md) / [経済ロードマップ](./ECONOMY_ROADMAP.md) |
| 実装 | `src/offlinePvp/` / `src/supabase/` / 一覧 UI / `App.tsx` フロー接続 |

---

## 目次

1. [目的とスコープ](#1-目的とスコープ)
2. [設計方針](#2-設計方針)
3. [モード比較](#3-モード比較)
4. [ユーザーフロー](#4-ユーザーフロー)
5. [データモデル](#5-データモデル)
6. [公開デッキプール](#6-公開デッキプール)
7. [一覧の並び・表示](#7-一覧の並び表示)
8. [BP 補正](#8-bp-補正)
9. [バトル開始・画面接続](#9-バトル開始画面接続)
10. [経済・戦績・広告](#10-経済戦績広告)
11. [UI 要件](#11-ui-要件)
12. [実装構成](#12-実装構成)
13. [履歴再戦との分離（必読）](#13-履歴再戦との分離必読)
14. [実装フェーズ](#14-実装フェーズ)
15. [テスト要件](#15-テスト要件)
16. [実装チェックリスト](#16-実装チェックリスト)
17. [将来拡張（本書の範囲外）](#17-将来拡張本書の範囲外)
18. [改訂履歴](#18-改訂履歴)

---

## 1. 目的とスコープ

### 1.1 目的

- **他ユーザーの公開デッキ（ゴースト）** と、自分のタイミングで対戦できるモードをプロトタイプに実装する。
- コア体験は「他人の絵を見る・そのデッキで遊ぶ」。リアルタイム同期は行わない。
- 経済・戦闘ルールの正は [ECONOMY_SPEC §13](./ECONOMY_SPEC.md#13-対人戦将来)。本書は **実装手順・型・画面・分岐** の正とする。

### 1.2 スコープ（v1）

| 含む | 含まない |
|------|----------|
| Supabase 公開デッキプール | （旧）同梱シード — **削除済み** |
| 公開デッキ一覧から選択して対戦 | 自分のデッキ公開オプトイン UI（v2） |
| 挑戦側デッキ戦力での BP 補正 | オンライン・フレンド対戦 |
| 通常 CPU 戦と同型の経済（戦利品・Lost・EXP） | 勝利カードのデッキ取り込み・別コレクション |
| 戦績履歴への追記（作者名表示） | ゴースト作者のリアルロスト |
| 現行 CPU AI による相手操作 | 作者の行動傾向の再現 |

### 1.3 現状（2026-07-04）

| 区分 | 状態 |
|------|------|
| 方針（ECONOMY §13） | **確定** |
| 実装 | **v1+G 実装済み**（一覧・通常経済パス・Supabase 公開） |
| フェーズ G | **実装済み**（Supabase・匿名認証・スロット公開トグル）。同梱シードは **削除済み**。セットアップは [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| BP 補正（戦力） | `prepareHistoryOpponentDeck`（出撃デッキ戦力へ比率スケール）**実装済み** |

---

## 2. 設計方針

1. **戦闘エンジンは流用** — `src/game/` の解決ロジック・CPU AI は変更しない（相手側は常に CPU 側フィールドとして扱う）。
2. **経済は通常 CPU 戦パス** — 履歴再戦の特殊分岐（ロストなし・特殊報酬モーダル等）に乗せない。
3. **相手デッキだけ差し替え** — 出所は公開プール、バトル直前に BP のみ挑戦側デッキ戦力へ補正。
4. **一覧から選ぶ** — 自動マッチのみにしない。絵を見てから対戦する。
5. **作者データは不変** — 勝敗しても公開スナップショットの元ユーザー所持カードは変わらない。
6. **公開プールは Supabase のみ** — 同梱シードは採用しない（削除済み）。
7. **解放は Lv10** — 挑戦（バトルハブ入口）・デッキ公開とも **ユーザーレベル ≥ 10**（デッキ2 解放と同タイミング）。定数 `OFFLINE_PVP_MIN_USER_LEVEL` / `isOfflinePvpUnlockedAtUserLevel`（`src/offlinePvp/unlock.ts`）。

---

## 3. モード比較

| 項目 | 通常 CPU 戦 | **オフライン対人（本モード）** | 履歴再戦 |
|------|-------------|-------------------------------|----------|
| 入口 | バトルハブ「CPU戦」 | バトルハブ「対人戦（オフライン）」**（Lv10+）** | 戦績 → バトル履歴 |
| 相手デッキ | `buildBalancedCpuDeck` 生成 | 公開プールから **プレイヤーが選択** | 履歴スナップショット |
| BP 補正 | 生成時に戦力帯合わせ | `prepareHistoryOpponentDeck`（挑戦側デッキ戦力） | 同左 |
| 相手表示名 | `CPU` | **作者名** | `CPU`（履歴当時） |
| マッチング探索 UI | あり（2〜4秒） | **スキップ**（相手確定済み） | スキップ |
| reveal カウントダウン | あり（5秒） | **あり**（履歴再戦と同様） | あり |
| EXP | あり | **あり** | なし |
| 勝利戦利品（px・かけら） | あり | **あり** | なし（特殊 px のみ） |
| 敗北 Lost | ランダム | **ランダム（v1）** | なし |
| 護符・Lv&lt;5 保護 | あり | **あり** | ロスト自体なし |
| `battleHistory` 追記 | あり | **あり**（`opponentName`＝作者名） | なし |
| 開始広告 | `battleStarts` 3回に1回 | **同じ** | `historyRematchStarts` 別カウント |
| 内部フラグ | （通常） | `isOfflinePvp === true` | `isHistoryRematch === true` |

---

## 4. ユーザーフロー

```text
バトルハブ
  └─「対人戦（オフライン）」
       └─ 公開デッキ一覧（viewerLevel 付近を優先表示）
            └─ 1件選択（任意: 詳細でカード閲覧）
                 └─ 自分のバトルデッキ選択（通常 CPU 戦と同じ readiness）
                      └─ [広告ゲート: 通常戦と同じ]
                           └─ battleSetup（matching スキップ → reveal → 配置）
                                └─ バトル
                                     └─ 勝敗処理（通常 CPU 戦と同型）
```

### 4.1 画面遷移

| 操作 | 遷移先 |
|------|--------|
| ハブでオフライン対人 | 公開デッキ一覧 |
| 一覧で戻る | バトルハブ |
| 一覧でデッキ選択（または詳細から対戦） | 自分のデッキ選択 |
| デッキ選択で戻る | 公開デッキ一覧（選択中ゴーストは保持してよい） |
| バトル開始 | `battleSetup` |
| matching / reveal キャンセル | 公開デッキ一覧またはバトルハブ（実装で一方に統一。推奨: **一覧**） |
| バトル終了後「バトルに戻る」等 | バトルハブ（通常戦と同様） |

### 4.2 デッキ選択の readiness

- 通常 CPU 戦と同じ: **ロストなしのバトル可能デッキ（5枚）** のみ開始可。
- `deckReadinessMode` は履歴再戦用（`historyRematch`）を使わない。

---

## 5. データモデル

### 5.1 `PublicGhostDeck`

公開プールの1エントリ。バトル中の相手スナップショットとは別物（プール側は補正前の元データ）。

```ts
/** 公開ゴーストデッキ（プール上の不変スナップショット） */
export interface PublicGhostDeck {
  id: string;
  /** 一覧・履歴・バトル中に表示する作者名 */
  authorName: string;
  /** 作者のユーザーレベル（公開時点）。一覧の並び・レベル差表示に使用 */
  authorLevel: number;
  /** ちょうど5枚。絵・属性・レア・★・限界突破等を含む Card スナップショット */
  deck: Card[];
  /** 任意。シードやサーバーの公開日時 */
  publishedAt?: string;
}
```

制約:

- `deck.length === 5`
- 各 `Card` は既存のパース／永続化と互換（`parseDeck` 等で読める形）
- `id` はプール内で一意（シードは固定文字列で可）

### 5.2 バトルモード識別

`App.tsx` で履歴再戦と排他的に扱う。

```ts
type BattleMode = 'cpu' | 'offlinePvp' | 'historyRematch';
```

実装方針（いずれか）:

- `isOfflinePvp` / `isOfflinePvpRef` を `isHistoryRematch` と対で持つ、または
- `battleMode: BattleMode` に統一する（リファクタする場合）

**同時に `isHistoryRematch` と `isOfflinePvp` が true になってはならない。**

### 5.3 フロー state（案）

```ts
/** オフライン対人: ゴースト選択後〜自分のデッキ選択中 */
interface OfflinePvpFlow {
  ghost: PublicGhostDeck;
  phase: 'deckSelect';
}
```

選択中のゴーストは `offlinePvpFlow` または ref に保持し、バトル開始まで破棄しない。

### 5.4 画面 ID

| 方式 | 内容 |
|------|------|
| **推奨（v1）** | `ScreenId` に `'offlinePvpList'` を追加し、`App.tsx` で描画 |
| 代替 | `BattleHubScreen` 内の view 分岐（`'modes' \| 'deckSelect' \| 'offlinePvpList'`） |

一覧をハブ外に出す場合は Dock のアクティブタブは `battleHub` のままとする（履歴再戦の records 内デッキ選択と同様の考え方）。

### 5.5 バトル開始時にセットする相手情報

```ts
setCpuDeck(prepareHistoryOpponentDeck(ghost.deck, playerDeck));
setCpuOpponent({
  name: ghost.authorName,
  level: ghost.authorLevel, // 表示用。BP 補正基準は playerDeck の戦力
});
```

- `BattleOpponentSnapshot.deck` には **補正後** のデッキが入る（既存の outcome 組み立てに合わせる）。
- 履歴の `opponentLevel` は作者レベル（`ghost.authorLevel`）を記録する。

---

## 6. 公開デッキプール

### 6.1 同梱シード（廃止）

開発初期に用いた `src/data/seedGhostDecks.ts` は **削除済み**。一覧は Supabase の公開行のみ。

### 6.2 プール API（UI 非依存）

```ts
/** viewerLevel 付近を優先した公開デッキ一覧（コピーを返す） */
export function listPublicGhostDecks(
  viewerLevel: number,
  options?: { minCount?: number },
): PublicGhostDeck[];

/** id で1件取得。無ければ null */
export function getPublicGhostDeckById(id: string): PublicGhostDeck | null;
```

実装:

- Supabase `public_ghost_decks` を参照。未設定・失敗時は空配列。
- 返す `deck` は呼び出し側で変更してもプールを汚さないよう **structuredClone** する。

### 6.3 フェーズ G（Supabase 公開プール）— 実装済み

端末内だけの公開（旧 v2）は採用せず、**最初からサーバー共有**する。

| 項目 | 決定 |
|------|------|
| バックエンド | **Supabase**（開発 Free / 本番 Pro 想定） |
| 認証 | **匿名サインイン**（端末セッション。後から Apple ログイン可） |
| 公開操作 | デッキスロットごとに **公開 ON/OFF**（マイデッキ） |
| 更新 | 公開 ON 中はデッキ保存のたびに **自動で最新化** |
| 一覧の自分 | **自分の公開デッキは出さない** |
| フォールバック | リモート失敗・未設定時は空一覧。文言は成功0件／通信失敗／未設定で区別 |
| 作者名 | **UserProfile.username** |
| 公開数 | 解放済みスロットはすべて可（最大5） |
| 公開条件 | **バトル可能（ロストなし5枚）のみ**。不可になった公開スロットは自動で非公開化 |
| DB 一意制約 | `(owner_id, slot_index)` — 同一 auth ユーザー・同一スロットは1行 |

セットアップ手順: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)  
SQL: `supabase/migrations/001_public_ghost_decks.sql`  
環境変数: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（`.env.example`）

### 6.4 メール連携と公開デッキ

メール連携・ログインで auth `user_id` が **匿名 → メールユーザー** に切り替わる。`(owner_id, slot_index)` は auth ごとに別行のため、対策しないと同一プレイヤー名の公開デッキが一覧に重複しうる。

| タイミング | 動作 |
|------------|------|
| 連携・ログイン **直前** | 匿名セッションの公開行をすべて削除（`deleteAllPublishedDecksForCurrentOwner`） |
| auth `user_id` **変更後** | 端末の `publishedDeckRemoteIds` をクリア。公開 ON のスロットを新 `owner_id` で再 upsert |
| upsert / unpublish | stale な `remoteId`（旧 owner の UUID）は無視。非公開は `owner_id + slot_index` で delete |

実装: `src/offlinePvp/publish.ts`・`republishPublishedDecks.ts`・`src/auth/emailLink.ts`（連携前削除）・`App.tsx`（認証切替時の再公開）

ログアウト時（メール → 匿名）は端末の公開フラグのみクリアし、サーバー上のメールユーザー公開行は残す（再ログインで復帰可能）。

---

## 7. 一覧の並び・表示

### 7.1 ソート（確定）

`viewerLevel`（挑戦者の現在レベル）に対し:

1. `|authorLevel - viewerLevel|` の昇順（近いレベル優先）
2. 同差なら `authorLevel` の昇順（または `id` で安定ソート）

`computeDeckPower` は **ソート必須キーにしない**。行の参考表示（戦力数値）に使ってよい。

### 7.2 レベル帯の広げ方

- 全件を常に表示してよい（件数が少ないシードではこれが単純）。
- 将来プールが増えた場合の推奨: 最初は `|Δlevel| ≤ 5`、件数不足なら `≤ 10`、なお不足なら全件。
- v1 は **全件表示 + 近い順ソート** で十分。

### 7.3 行に表示する情報

| 要素 | 必須 |
|------|------|
| 作者名 | ✅ |
| 作者 Lv | ✅ |
| デッキサムネ 5 枚（レア枠色付き可。`BattleHistoryList` 流用） | ✅ |
| デッキ戦力（補正前・`computeDeckPower`） | ✅（ユーザー名の下。詳細モーダルにも表示） |
| 参考戦力と差があるとき「戦力補正あり」等のラベル | ✅（戦力の右。公開戦力 ≠ 自分の参考デッキ戦力） |

勝敗アイコンは一覧に出さない（未対戦の公開デッキのため）。

### 7.4 空状態

| 状況 | 表示 |
|------|------|
| 取得成功・0件 | 「公開デッキがありません」 |
| 通信失敗 | 「公開デッキを取得できませんでした」＋通信確認のヒント |
| 接続未設定 | 「公開デッキを表示できません」＋設定のヒント |

---

## 8. BP 補正（戦力補正）

### 8.1 適用タイミング

自分のデッキ選択完了後、`battleSetup` に入る直前（または入った直後の state セット時）に **1回**。

```ts
import { prepareHistoryOpponentDeck } from '../historyRematch';

const opponentDeck = prepareHistoryOpponentDeck(ghost.deck, playerDeck);
```

`prepareHistoryOpponentDeck` は履歴再戦と共通。相手デッキ全体の BP を同じ比率で伸ばす／縮め、`computeDeckPower` が挑戦側出撃デッキ戦力に**おおむね**寄るようにする（厳密一致は不要）。

### 8.2 基準

**常に挑戦側（自分）の出撃デッキ戦力**（`computeDeckPower(playerDeck)`）。作者レベル・公開時戦力そのものでは補正しない。

### 8.3 揃うもの / 揃わないもの

[ECONOMY §13.2.4](./ECONOMY_SPEC.md#1324-bp-補正確定) に従う。

- 揃う（おおむね）: デッキ戦力（各カード BP の比率スケール）
- 揃わない: ピクセル・塗り・色数（戦利品 px）、レア（かけら）、属性構成・相性、限界突破回数の「育成感」

一覧に出すサムネの BP 表示をする場合:

- **一覧・詳細**: 公開時（補正前）の BP・戦力を出してよい
- **バトル中**: 補正後の BP

詳細注釈: 「相手カードの BP はあなたのデッキ戦力に合わせて調整されます」（履歴再戦ルールモーダルと同趣旨）。

---

## 9. バトル開始・画面接続

### 9.1 開始関数（案）

`goToBattleSetup`（通常 CPU）の姉妹として `startOfflinePvpBattle(deckIndex)` を用意する。

処理概要:

1. `offlinePvpFlow.ghost` が無ければ return
2. 自分のデッキを readiness チェック（通常戦と同じ）
3. `isHistoryRematch = false` / `isOfflinePvp = true`（ref も同期）
4. `battleStartSnapshotRef` を通常戦と同様にセット（履歴追記・ロスト用）
5. `setCpuDeck(prepareHistoryOpponentDeck(ghost.deck, playerDeck))`
6. `setCpuOpponent({ name: ghost.authorName, level: ghost.authorLevel })`
7. 広告カウント: 通常戦と同じ `battleStarts`（§10.3）
8. `setScreen('battleSetup')`、`enableOpponentMatching={false}`

### 9.2 `BattleSetupScreen` props

| prop | オフライン対人 |
|------|----------------|
| `isHistoryRematch` | `false` |
| `enableOpponentMatching` | `false` |
| `opponentIdentity` | 作者名・作者 Lv |
| `cancelMatchShowsCost` | 通常戦に合わせる（matching スキップ時はキャンセルコストの有無を既存 reveal 仕様に合わせる） |

キャンセル先は §4.1。オフライン対人用の `onCancelMatch` を渡す。

### 9.3 相手 AI（G8 v1 確定）

ゴースト側ターンは **現行 CPU AI のまま**。追加実装なし。

### 9.4 敗北時墓地選択（G4 v1 確定）

**通常 CPU 戦と同じランダム**（既存 `LostRoulette`）。作者意図の再現は行わない。

---

## 10. 経済・戦績・広告

経済ルールの数値・式は [ECONOMY_SPEC §4](./ECONOMY_SPEC.md#4-バトル報酬ペナルティ) が正。本書は分岐のみ定義する。

### 10.1 勝利（挑戦者）

| 項目 | 内容 |
|------|------|
| 操作 | 相手墓地から1枚選択 |
| 獲得 | px ＋ 属性かけら |
| カード | **自デッキに保存しない**。別コレクションにも保存しない |

### 10.2 敗北（挑戦者）

| 項目 | 内容 |
|------|------|
| Lost | 自軍墓地からランダム1枚（Lv≥5、護符有効） |
| 作者 | 所持カードに影響なし |

### 10.3 広告（G7 v1 確定）

通常 CPU 戦と同じ:

- `isNormalBattleAdsEnabledAtUserLevel`
- `shouldRequireBattleStartAd(battleStarts)`
- カウントは `adState.battleStarts`
- 履歴再戦用の `historyRematchStarts` は使わない

### 10.4 戦績・履歴（G6 v1 確定）

| 項目 | 内容 |
|------|------|
| EXP | 通常戦どおり加算 |
| カード wins/losses | 更新する |
| ユーザー battleWins/Losses | 更新する |
| `battleHistory` | **追記する** |
| `opponentName` | `ghost.authorName` |
| `opponentLevel` | `ghost.authorLevel` |
| `opponentDeck` | 出撃時の相手デッキ（**補正後**でよい。既存 CPU 戦と同様 outcome 由来） |

履歴詳細から「もう一度対戦する」を押した場合:

- v1: 既存の履歴再戦フロー（ロストなし・特殊報酬）でよい。オフライン対人モードの再実行は必須としない。
- 将来: 同じ `PublicGhostDeck.id` があればオフライン対人として再戦、は任意拡張。

### 10.5 ミッション

通常バトル勝利・敗北イベントを既存どおり報告する。履歴再戦除外のミッション条件がある場合、オフライン対人は **通常バトル扱い**（除外しない）。

---

## 11. UI 要件

### 11.1 バトルハブ

- 「対人戦（オフライン）」は **Lv10 未満は disabled**（`Lv10で解放` 表示）。Lv10 以上でタップ → 公開デッキ一覧。
- 「フレンド対戦」は引き続き disabled。

### 11.2 公開デッキ一覧

- タイトル例:「公開デッキ」または「対人戦（オフライン）」
- 戻るボタンでハブへ
- 行タップで詳細または直接デッキ選択（詳細ありを推奨）

### 11.3 詳細（推奨）

- 作者名・Lv、デッキ5枚、カードタップで閲覧（編集不可）
- 主ボタン:「このデッキと対戦」
- UI 種: `BattleHistoryDetailOverlay` を参考

### 11.4 ヘルプ

- バトルハブヘルプ（`getBattleHubHelp`）は **CPU戦・対人戦（オフライン）共通** の流れを本体とし、「モードのちがい」セクションで差分のみ記載する。
- 共通: デッキ要件（5枚・ロストなし）→ 相手確定後の確認 → 準備画面（前衛2・後衛3）→ ターン操作・勝敗報酬・ロスト。
- 対人戦の差分: 公開デッキ一覧から相手を選ぶ / BP は自分のデッキ戦力に合わせて調整 / 相手の絵・属性は公開スナップショットのまま / 相手の所持カードは減らない。
- マイデッキヘルプ（`getDeckHelp`）に **対人戦へのデッキ公開**（チェックで他ユーザーに公開）を記載。

### 11.5 相手名の表示

`CPU_OPPONENT_LABEL`（`'CPU'`）をオフライン対人で使わない。`cpuOpponent.name`（作者名）をバトル UI・履歴・終了画面で一貫表示する。固定文字列 `'CPU'` の直書き箇所を洗い、モードに応じて切り替える。

---

## 12. 実装構成

### 12.1 推奨ディレクトリ

```text
src/
  offlinePvp/
    types.ts              # PublicGhostDeck
    listPublicGhostDecks.ts
    listPublicGhostDecks.test.ts
  historyRematch.ts       # prepareHistoryOpponentDeck（既存・流用）
  components/
    OfflinePvpDeckListScreen.tsx
    OfflinePvpDeckDetailOverlay.tsx  # 任意
    BattleHubScreen.tsx              # 入口有効化
  App.tsx                            # フロー・経済分岐
  types/index.ts                     # ScreenId 等
```

### 12.2 触らないもの（v1）

- `src/game/resolveTurn.ts` および各 turn phase
- 戦利品・Lost の計算式（`economy.ts` 等）の数値変更
- フレンド対戦・リアルタイム同期

### 12.3 既存コードの再利用

| 既存 | 用途 |
|------|------|
| `prepareHistoryOpponentDeck` | BP 補正 |
| `BattleHistoryList` のサムネ行 | 一覧 UI |
| `BattleHistoryDetailOverlay` | 詳細 UI |
| `BattleDeckSelectScreen` | 自分のデッキ選択 |
| `goToBattleSetup` / 終了処理 | 姉妹関数・通常経済パス |
| `createBattleHistoryEntry` | 履歴追記（opponent に作者情報） |

---

## 13. 履歴再戦との分離（必読）

オフライン対人を `isHistoryRematchRef.current === true` の分岐に入れてはならない。

履歴再戦専用の処理例（オフライン対人では **実行しない**）:

- `HistoryRematchRewardModal`
- Lost スキップ
- EXP 非加算
- `battleHistory` 非追記
- `historyRematchStarts` 広告カウント

オフライン対人は **通常 CPU 戦の終了処理パス**を通す。差分は「相手デッキの出所」と「相手表示名」と「matching スキップ」のみ。

---

## 14. 実装フェーズ

各フェーズは独立してマージ可能な単位を想定する。

### フェーズ A — 型とプール API

1. `PublicGhostDeck` 型
2. ~~`seedGhostDecks.ts`~~ — **削除済み**
3. `listPublicGhostDecks` / `getPublicGhostDeckById`（Supabase）
4. ソートのユニットテスト（テスト内フィクスチャ）

**完了条件**: UI なしでソートがテスト可能。一覧はリモート依存。

### フェーズ B — 一覧 UI

1. `ScreenId` またはハブ内 view
2. `OfflinePvpDeckListScreen`
3. `BattleHubScreen` の入口有効化
4. 戦力差ラベル（戦力補正あり）

**完了条件**: シードが一覧表示され、選択コールバックが飛ぶ。

### フェーズ C — バトル開始接続

1. `OfflinePvpFlow` state
2. 自分のデッキ選択
3. `startOfflinePvpBattle`
4. `prepareHistoryOpponentDeck` 適用
5. matching スキップ・作者名表示

**完了条件**: 選んだゴーストの絵で最後までバトルできる。

### フェーズ D — 経済・履歴・広告

1. `isOfflinePvp` を通常終了パスへ
2. 履歴に作者名で追記
3. 開始広告を通常戦と同じに
4. 履歴再戦分岐に入っていないことの確認

**完了条件**: 戦利品・Lost・EXP・履歴が通常戦と同様に動く。

### フェーズ E — ヘルプ・表示仕上げ

1. ハブヘルプ更新
2. `'CPU'` 直書きの除去確認
3. README 進捗チェック更新

### フェーズ F — スキップ

端末内だけの公開は採用しない（他ユーザーから見えないため）。

### フェーズ G — Supabase 公開プール

1. ~~公開デッキ API（Supabase）~~ — **実装済み**
2. ~~匿名認証・スロット公開トグル・自動同期~~ — **実装済み**
3. ~~`listPublicGhostDecks` リモートのみ（シード削除）~~ — **実装済み**

---

## 15. テスト要件

### 15.1 自動テスト

| 対象 | 内容 |
|------|------|
| `listPublicGhostDecks` | `viewerLevel` に近い `authorLevel` が先頭付近になる |
| `listPublicGhostDecks` | 返却デッキがプールを mutate しない |
| `prepareHistoryOpponentDeck` | 属性・ピクセル・レア不変、BP のみプレイヤー戦力へ比率スケール |
| モード分岐（可能なら） | オフライン対人開始が `isHistoryRematch` を立てない |

### 15.2 手動確認

1. 同レベル帯の公開デッキと対戦し、作者の絵が見える
2. 戦力差の大きいゴーストを選び、一方的な押し負けにならない
3. 勝利で戦利品（px・かけら）、カードがデッキに増えない
4. Lv5+ で敗北すると Lost（護符があれば免れる）
5. 履歴に作者名で残る
6. 履歴再戦の報酬モーダルが出ない

---

## 16. 実装チェックリスト

### フェーズ A

- [x] `PublicGhostDeck` 型
- [x] ~~シード 8 件~~ → **削除済み**（リモートのみ）
- [x] `listPublicGhostDecks` / `getPublicGhostDeckById`
- [x] ソートのテスト（フィクスチャはテスト内）

### フェーズ B

- [x] 一覧画面
- [x] ハブ入口の有効化
- [x] 戦力差ラベル（戦力補正あり）
- [x] 戻る → ハブ

### フェーズ C

- [x] ゴースト選択 → 自分のデッキ選択
- [x] `startOfflinePvpBattle`
- [x] BP 補正適用
- [x] 作者名表示
- [x] matching スキップ、reveal 実施

### フェーズ D

- [x] EXP・戦利品・Lost・護符・初心者保護
- [x] `battleHistory` 追記（作者名）
- [x] 広告 `battleStarts`
- [x] 履歴再戦パスに乗っていない

### フェーズ E

- [x] ヘルプ文言
- [x] README 進捗
- [x] PROTOTYPE / ECONOMY の「未実装」表記を実装後に更新

---

## 17. 将来拡張（本書の範囲外）

| 項目 | 参照 |
|------|------|
| オンライン・フレンド（勝者選択＝敗者 Lost） | [ECONOMY §13.3](./ECONOMY_SPEC.md#133-オンライン対人戦将来構想保留) |
| リアルタイムマッチ | 同上 |
| 敗北時の高度な墓地選択（G4 高度化） | ランダム以外が必要になった時点で改訂 |
| 作者 AI の行動傾向（G8 高度化） | 長期 |

---

## 18. 改訂履歴

| 版 | 日付 | 内容 |
|----|------|------|
| 1.7 | 2026-07-05 | §2 解放 Lv10（挑戦・公開）。§3 入口表・§11.1 ハブ disabled 追記 |
| 1.6 | 2026-07-05 | §6.3 DB 一意制約追記。§6.4 メール連携と公開デッキ（auth 切替時の重複防止） |
| 1.5 | 2026-07-04 | §11.4 ヘルプを CPU/対人戦共通構成に更新。マイデッキヘルプの公開説明を追記 |
| 1.4 | 2026-07-04 | BP 補正をレベル再計算から**出撃デッキ戦力**への比率スケールに変更（履歴再戦と共通）。一覧バッジは戦力差 |
| 1.3 | 2026-07-04 | 同梱シード（`seedGhostDecks.ts`）を削除。一覧は Supabase のみ |
| 1.2 | 2026-07-04 | フェーズ G（Supabase 公開プール・匿名認証・公開トグル）。F はスキップ。SUPABASE_SETUP.md |
| 1.1 | 2026-07-04 | v1 実装完了（同梱シード・一覧・詳細・通常経済パス）。チェックリスト A〜E 完了 |
| 1.0 | 2026-07-04 | 初版。ECONOMY §13 の確定方針に基づく実装仕様。G4/G6/G7/G8 の v1 仮決めを固定。フェーズ A〜E |

---

*経済・数値の正は ECONOMY_SPEC。画面・型・分岐・実装順序の正は本書。矛盾する場合は実装前に両文書を同期すること。*
