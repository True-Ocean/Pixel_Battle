# 簡単！真剣！お絵描きピクセルバトル！ — オフライン対人戦 実装仕様書

| 項目 | 内容 |
|------|------|
| ドキュメント版 | 1.1 |
| 最終更新 | 2026-07-04 |
| 対象 | ウェブプロトタイプ（React + Vite + TypeScript） |
| 関連 | [経済仕様 §13](./ECONOMY_SPEC.md#13-対人戦将来) / [プロトタイプ開発指示書](./PROTOTYPE_DEVELOPMENT_SPEC.md) / [経済ロードマップ](./ECONOMY_ROADMAP.md) |
| 実装予定 | `src/offlinePvp/` / `src/data/seedGhostDecks.ts` / 一覧 UI / `App.tsx` フロー接続 |

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
| 同梱シード公開デッキプール | サーバー API・認証 |
| 公開デッキ一覧から選択して対戦 | 自分のデッキ公開オプトイン UI（v2） |
| 挑戦側レベルでの BP 補正 | オンライン・フレンド対戦 |
| 通常 CPU 戦と同型の経済（戦利品・Lost・EXP） | 勝利カードのデッキ取り込み・別コレクション |
| 戦績履歴への追記（作者名表示） | ゴースト作者のリアルロスト |
| 現行 CPU AI による相手操作 | 作者の行動傾向の再現 |

### 1.3 現状（2026-07-04）

| 区分 | 状態 |
|------|------|
| 方針（ECONOMY §13） | **確定** |
| 実装 | **v1 実装済み**（同梱シード・一覧・通常経済パス） |
| BP 補正の足がかり | `prepareHistoryOpponentDeck` / `rescaleDeckBp` **実装済み** |

---

## 2. 設計方針

1. **戦闘エンジンは流用** — `src/game/` の解決ロジック・CPU AI は変更しない（相手側は常に CPU 側フィールドとして扱う）。
2. **経済は通常 CPU 戦パス** — 履歴再戦の特殊分岐（ロストなし・特殊報酬モーダル等）に乗せない。
3. **相手デッキだけ差し替え** — 出所は公開プール、バトル直前に BP のみ挑戦側レベルへ補正。
4. **一覧から選ぶ** — 自動マッチのみにしない。絵を見てから対戦する。
5. **作者データは不変** — 勝敗しても公開スナップショットの元ユーザー所持カードは変わらない（プロトタイプではシードのため該当なし）。
6. **段階実装** — v1 はシードプールで体験を完成させ、公開オプトイン・サーバーは後段（§14・§17）。

---

## 3. モード比較

| 項目 | 通常 CPU 戦 | **オフライン対人（本モード）** | 履歴再戦 |
|------|-------------|-------------------------------|----------|
| 入口 | バトルハブ「CPU戦」 | バトルハブ「対人戦（オフライン）」 | 戦績 → バトル履歴 |
| 相手デッキ | `buildBalancedCpuDeck` 生成 | 公開プールから **プレイヤーが選択** | 履歴スナップショット |
| BP 補正 | 生成時に戦力帯合わせ | `prepareHistoryOpponentDeck`（挑戦側 Lv） | 同左 |
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
setCpuDeck(prepareHistoryOpponentDeck(ghost.deck, playerLevel));
setCpuOpponent({
  name: ghost.authorName,
  level: ghost.authorLevel, // 表示用。BP 補正基準は playerLevel
});
```

- `BattleOpponentSnapshot.deck` には **補正後** のデッキが入る（既存の outcome 組み立てに合わせる）。
- 履歴の `opponentLevel` は作者レベル（`ghost.authorLevel`）を記録する。

---

## 6. 公開デッキプール

### 6.1 v1: 同梱シード

| 項目 | 内容 |
|------|------|
| 配置 | `src/data/seedGhostDecks.ts`（または同ディレクトリの JSON を import） |
| 件数 | **最低 8 件**推奨。レベル帯を分散（例: 3 / 8 / 12 / 18 / 25 / 35 / 45 / 50 付近） |
| 多様性 | 属性・レア・塗り密度が偏らないこと（戦利品差の検証用） |
| 作者名 | 日本語の仮名で可（例: `ドット太郎`）。`CPU` は使わない |

シードはコードレビュー可能な静的データとする。実行時に `buildBalancedCpuDeck` で生成してプールに載せる方式は **採用しない**（「他人の絵」に見えないため）。手描きスナップショット、または開発用セーブからエクスポートした `Card[]` を埋め込む。

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

- v1 はシード配列のみ参照。
- 返す `deck` は呼び出し側で変更してもプールを汚さないよう **structuredClone** する。

### 6.3 v2 以降（本書では仕様予約）

| 段階 | 内容 |
|------|------|
| v2 | ユーザーがデッキスロットをオプトイン公開。端末内プールにマージ（他端末からは不可） |
| v3 | サーバー公開プール。`listPublicGhostDecks` の実装差し替え。シードはフォールバック可 |

v1 では公開トグル UI・`SaveData` 拡張は **必須としない**。

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
| レベル差があるとき「戦力補正あり」等のラベル | ✅（`authorLevel !== viewerLevel` のとき） |
| デッキ戦力（補正前） | 任意 |

勝敗アイコンは一覧に出さない（未対戦の公開デッキのため）。

### 7.4 空状態

シードがある v1 では通常発生しない。フォールバック文言例:「公開デッキがありません」。

---

## 8. BP 補正

### 8.1 適用タイミング

自分のデッキ選択完了後、`battleSetup` に入る直前（または入った直後の state セット時）に **1回**。

```ts
import { prepareHistoryOpponentDeck } from '../historyRematch';

const opponentDeck = prepareHistoryOpponentDeck(ghost.deck, playerLevel);
```

`prepareHistoryOpponentDeck` は既存実装をそのまま使う（内部で `rescaleDeckBp`）。

### 8.2 基準レベル

**常に挑戦側（自分）の `user.level`**。作者レベルでは補正しない。

### 8.3 揃うもの / 揃わないもの

[ECONOMY §13.2.4](./ECONOMY_SPEC.md#1324-bp-補正確定) に従う。

- 揃う: 戦闘中 BP
- 揃わない: ピクセル・塗り・色数（戦利品 px）、レア（かけら）、限界突破回数の「育成感」

一覧に出すサムネの BP 表示をする場合:

- **一覧・詳細**: 公開時（補正前）の BP を出してよい
- **バトル中**: 補正後の BP

履歴再戦ヘルプの「相手カードのBPはあなたのデッキに合わせて調整されます」と同趣旨の一文を、オフライン対人のヘルプまたは一覧注釈に置く。

---

## 9. バトル開始・画面接続

### 9.1 開始関数（案）

`goToBattleSetup`（通常 CPU）の姉妹として `startOfflinePvpBattle(deckIndex)` を用意する。

処理概要:

1. `offlinePvpFlow.ghost` が無ければ return
2. 自分のデッキを readiness チェック（通常戦と同じ）
3. `isHistoryRematch = false` / `isOfflinePvp = true`（ref も同期）
4. `battleStartSnapshotRef` を通常戦と同様にセット（履歴追記・ロスト用）
5. `setCpuDeck(prepareHistoryOpponentDeck(ghost.deck, level))`
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

- 「対人戦（オフライン）」の `disabled` /「準備中」を解除。
- タップで公開デッキ一覧へ。
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

- バトルハブヘルプにオフライン対人の短い説明を追加。
- 要点: 公開デッキを選んで対戦 / BP は自分のレベルに合わせて調整 / 勝敗の報酬・ロストは CPU 戦と同じ / 相手の絵は本物の公開スナップショット

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
  data/
    seedGhostDecks.ts     # シード配列
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

### フェーズ A — 型とシードプール

1. `PublicGhostDeck` 型
2. `seedGhostDecks.ts`（8件以上）
3. `listPublicGhostDecks` / `getPublicGhostDeckById`
4. ソートのユニットテスト

**完了条件**: UI なしで一覧データとソートがテスト可能。

### フェーズ B — 一覧 UI

1. `ScreenId` またはハブ内 view
2. `OfflinePvpDeckListScreen`
3. `BattleHubScreen` の入口有効化
4. レベル差ラベル

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

### フェーズ F — v2（任意・後続）

1. デッキ公開オプトイン
2. ローカル公開プールへのマージ

### フェーズ G — v3（任意・後続）

1. 公開デッキ API
2. `listPublicGhostDecks` のリモート実装

---

## 15. テスト要件

### 15.1 自動テスト

| 対象 | 内容 |
|------|------|
| `listPublicGhostDecks` | `viewerLevel` に近い `authorLevel` が先頭付近になる |
| `listPublicGhostDecks` | 返却デッキがプールを mutate しない |
| `prepareHistoryOpponentDeck`（既存） | 属性・ピクセル・レア不変、BP のみ変化 |
| モード分岐（可能なら） | オフライン対人開始が `isHistoryRematch` を立てない |

### 15.2 手動確認

1. 同レベル帯のゴーストと対戦し、絵がシードどおり見える
2. レベル差の大きいゴーストを選び、一方的な押し負けにならない
3. 勝利で戦利品（px・かけら）、カードがデッキに増えない
4. Lv5+ で敗北すると Lost（護符があれば免れる）
5. 履歴に作者名で残る
6. 履歴再戦の報酬モーダルが出ない

---

## 16. 実装チェックリスト

### フェーズ A

- [x] `PublicGhostDeck` 型
- [x] シード 8 件以上（レベル分散）
- [x] `listPublicGhostDecks` / `getPublicGhostDeckById`
- [x] ソート・clone のテスト

### フェーズ B

- [x] 一覧画面
- [x] ハブ入口の有効化
- [x] レベル差ラベル
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
| 1.1 | 2026-07-04 | v1 実装完了（同梱シード・一覧・詳細・通常経済パス）。チェックリスト A〜E 完了 |
| 1.0 | 2026-07-04 | 初版。ECONOMY §13 の確定方針に基づく実装仕様。G4/G6/G7/G8 の v1 仮決めを固定。フェーズ A〜E |

---

*経済・数値の正は ECONOMY_SPEC。画面・型・分岐・実装順序の正は本書。矛盾する場合は実装前に両文書を同期すること。*
