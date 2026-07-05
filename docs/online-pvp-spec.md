# 簡単！真剣！お絵描きピクセルバトル！ — オンライン対人戦 実装仕様書（v2）

| 項目 | 内容 |
|------|------|
| ドキュメント版 | 1.0 |
| 最終更新 | 2026-07-05 |
| 対象 | ウェブプロトタイプ（React + Vite + TypeScript + Supabase） |
| 関連 | [ECONOMY_SPEC §13.3](./ECONOMY_SPEC.md#133-オンライン対人戦--将来構想保留) / [OFFLINE_PVP_SPEC](./OFFLINE_PVP_SPEC.md) / [SUPABASE_SETUP](./SUPABASE_SETUP.md) |
| 実装ブランチ | `feature/online-pvp-v2` |
| 参照アーカイブ | `archive/online-pvp-v0`（凍結・マージしない） |

---

## 目次

1. [目的・非目的](#1-目的非目的)
2. [単一正本（Single Source of Truth）](#2-単一正本single-source-of-truth)
3. [サーバー状態機械](#3-サーバー状態機械)
4. [不変条件](#4-不変条件)
5. [API（クライアントが触れる操作）](#5-apiクライアントが触れる操作)
6. [クライアント UI 導出ルール](#6-クライアント-ui-導出ルール)
7. [Clash 再生方針](#7-clash-再生方針)
8. [受け入れ条件](#8-受け入れ条件)
9. [v0 で失敗した Anti-Patterns](#9-v0-で失敗した-anti-patterns)
10. [archive/online-pvp-v0 から残す資産](#10-archiveonline-pvp-v0-から残す資産)
11. [実装フェーズ](#11-実装フェーズ)
12. [テスト要件](#12-テスト要件)
13. [改訂履歴](#13-改訂履歴)

---

## 1. 目的・非目的

### 1.1 目的

- **2人のフレンド**がルームコードで同時にバトルできる **オンライン対人戦（真剣勝負）** を実装する。
- 盤面・フェーズの **唯一の正本は Supabase 上の `online_battle_rooms` 1行** とする。
- クライアントは **描画 + 入力送信** のみ。ターン解決・昇格・ターン開始は **サーバー（`roomApi`）** が行う。
- **操作不能・フェーズ飛ばし（昇格前に行動選択）をゼロ** にすることを最優先とする。

### 1.2 非目的（v2 スコープ外）

| 含まない | 理由 |
|----------|------|
| ランダムマッチ / ランキング | 人口・チート対策が別問題 |
| ロールバック予測・入力先行 | ターン制のため不要 |
| 観戦 | 後段 |
| Reconnect 自動復旧の完全実装 | v2 は切断猶予・forfeit のみ |
| `useBattle` へのオンライン後付け | v0 で破綻。v2 では禁止 |
| 不整合の事後修復 API 依存 | 書き込み時 prevent を正とする |

### 1.3 経済・ルールの正

- 勝者が相手墓地1枚を選び px・かけら取得、敗者は **同じ1枚** が Lost — [ECONOMY_SPEC §13.3](./ECONOMY_SPEC.md#133-オンライン対人戦--将来構想保留)
- 戦闘エンジン（`resolveTurn` / 昇格 / 毒DoT）は **`src/game/` を変更せず流用**
- 解放レベル: **Lv10**（オフライン対人と同じ）

---

## 2. 単一正本（Single Source of Truth）

### 2.1 正本データ

| フィールド | 役割 |
|------------|------|
| `battle_state` | host 視点の `BattleState` JSON |
| `battle_phase` | サーバー状態機械の現在フェーズ |
| `battle_revision` | 単調増加。クライアントは `<= 処理済み` を無視 |
| `host_pending_action` / `guest_pending_action` | select 中の行動選択 |
| `last_clash` | clash 確定メタ + 再生用 |

### 2.2 クライアントが持てるローカル state

| 種類 | 例 | 正本か |
|------|-----|--------|
| サーバー snapshot から導出した表示 state | `toLocalBattleState(room.battleState, role)` | **表示の正** |
| 昇格の途中選択 | `promotionDraft: { from, to }` | ドラフトのみ |
| リプレイ overlay | clash / 毒DoT アニメ中の一時表示 | 演出のみ。phase 決定に使わない |
| `useState(battleState)` を正本にする | — | **禁止** |

### 2.3 Guest 視点

- DB の `battle_state` は **常に host 視点**。
- Guest クライアントは `flipBattleStateForGuest` / `toLocalBattleState` で **player/cpu を反転**して表示・導出する。
- サーバー側 `onlinePromotionNeeded` / `submitOnlinePromotion` は host 視点 state に対して評価。Guest 操作時は `role === 'guest'` → サーバー上 `cpu` 側を更新。

---

## 3. サーバー状態機械

### 3.1 ルームライフサイクル（バトル外）

```
waiting → deck_select → setup → battle → rematch_wait | closed
```

- ルーム作成・参加・デッキ提出・配置・setup ready は v0 の `roomApi` を **ほぼそのまま** 移植（[§10](#10-archiveonline-pvp-v0-から残す資産)）。

### 3.2 バトル中フェーズ

```
                    ┌──────────────────────────────────────┐
                    │              [select]                 │
                    │  両者が行動を host/guest_pending に保存 │
                    └───────────────┬──────────────────────┘
                                    │ 両者選択済み
                                    ▼
                         resolveOnlineClash（サーバー1箇所）
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            onlinePromotionNeeded           不要
                    │                               │
                    ▼                               ▼
              [promotion]                    applyTurnStart
                    │                      （毒DoT・turn++）
                    │ submitPromotion              │
                    │ （両者完了まで）              │
                    └───────────────┬──────────────┘
                                    ▼
                              [select]  （次ターン）
```

**v2 の変更点（v0 から）**

| v0 | v2 |
|----|-----|
| クライアントが `advanceTurnStart` を呼ぶ | **サーバー内部**で promotion 完了 → turn_start → select を一気通貫 |
| `App.tsx` subscribe からも `resolveOnlineClash` | **`submitOnlineBattleChoice` 内のみ** |
| `turn_start` をクライアントが意識 | DB 上は遷移用。クライアントは promotion→select の結果だけ見る |
| `clash_resolved` phase | **削除**（未使用。011 migration の check から除外） |

### 3.3 各遷移の責務

| 遷移 | 実行者 | 入力 | 出力 |
|------|--------|------|------|
| 行動選択 | Client → `submitOnlineBattleChoice` | `BattleActionChoice` | pending 更新。両者揃えば `resolveOnlineClash` |
| Clash 解決 | Server `resolveOnlineClash` | 両 pending | `battle_state` 更新、`last_clash` 設定、phase → promotion or 内部 turn_start |
| 昇格 | Client → `submitOnlinePromotion` | from, to | `battle_state` 更新。まだ必要なら promotion、否则 **サーバーが turn_start→select まで実行** |
| ターン開始 | **Server 内部のみ** | — | 毒DoT 適用、`turn++`、pending クリア、phase → select |
| 昇格 1択自動 | Server `autoCompleteForcedPromotions` | — | clash 直後・promotion 送信後に **サーバー側のみ** |

---

## 4. 不変条件

以下は **すべての `battle_state` / `battle_phase` 更新** で満たす。開発ビルドでは `assertOnlineBattlePhaseInvariant` で assert、本番 API では違反 update を reject。

| ID | 条件 |
|----|------|
| INV-1 | `battle_phase === 'select'` ⇒ `!onlinePromotionNeeded(battle_state)` |
| INV-2 | `battle_phase === 'promotion'` ⇒ `onlinePromotionNeeded(battle_state)` |
| INV-3 | `battle_revision` は state/phase 更新ごとに +1 |
| INV-4 | `select` 中、`host_pending_action` / `guest_pending_action` は片方のみ非 null が最大（両方揃った瞬間に clash へ） |
| INV-5 | clash 解決後、`host_pending_action` と `guest_pending_action` は **必ず null** |
| INV-6 | `last_clash.preClashRevision + 1 === battle_revision`（clash 直後） |

**repair API**（v0 の `repairOnlineBattlePhase`）は v2 では **本番経路に置かない**。テスト・手動復旧用に残す場合は admin のみ。

---

## 5. API（クライアントが触れる操作）

### 5.1 バトル中（v2 クライアントが呼ぶ）

| 関数 | フェーズ | 説明 |
|------|----------|------|
| `submitOnlineBattleChoice(roomId, role, choice)` | select | 行動保存。両者揃えばサーバーが clash まで完結 |
| `submitOnlinePromotion(roomId, role, from, to)` | promotion | 昇格。完了後サーバーが turn_start→select |
| `applyOnlineNinjaStalemateBreak(roomId)` | select | 忍術ステルス膠着解除（�面条件時） |
| `applyOnlineBattleForfeit(roomId, role)` | any | 降参 |
| `subscribeOnlineBattleRoom(roomId, cb)` | any | Realtime 購読 + 初回 fetch |

### 5.2 バトル外（v0 から移植）

| 関数 | 説明 |
|------|------|
| `createOnlineBattleRoom` / `joinOnlineBattleRoom` | ルーム作成・参加 |
| `submitOnlineDeck` | デッキ提出 |
| `submitOnlineSetup` | 配置 + ready |
| `submitOnlineRematchReady` / `requestOnlineDeckChange` / `closeOnlineBattleRoom` | 再戦・デッキ変更・退出 |
| `syncOnlineWalletBalance` | ウォレット同期 |
| `markOnlineDisconnect` / `clearOnlineDisconnect` | 切断管理 |

### 5.3 v2 でクライアントが呼ばない（削除 or 内部化）

| v0 関数 | v2 |
|---------|-----|
| `advanceTurnStart` | **server private**。export しない |
| `repairOnlineBattlePhase` | 本番経路外（任意で dev のみ） |
| `resolveOnlineClash` を subscribe から呼ぶ | **禁止** |
| `syncOnlineBattleState` / `tryResolveOnlineTurn` | 削除済み deprecated |

### 5.4 Realtime

- `subscribeOnlineBattleRoom` — postgres_changes on `online_battle_rooms`
- Publication `supabase_realtime` に本テーブル追加必須（[SUPABASE_SETUP](./SUPABASE_SETUP.md)）

---

## 6. クライアント UI 導出ルール

### 6.1 原則

- **新規フック `useOnlineBattleSession(room, role)`** を作る。`useBattle` は **オフライン専用** のまま触らない。
- UI フェーズは **1関数**から導出:

```typescript
type OnlineUiPhase =
  | 'pickMain' | 'pickTarget' | 'pickShield' | 'pickHeal'
  | 'promoteUnit' | 'promoteSlot' | 'waitOpponentPromotion'
  | 'clashReplay' | 'turnStartPoison' | 'waitOpponent' | 'ended';

function deriveOnlineUiPhase(input: {
  room: OnlineBattleRoom;       // 正本
  localState: BattleState;      // toLocalBattleState(room.battleState)
  promotionDraft: PromotionDraft;
  replayOverlay: ReplayOverlay | null;
  waitingForOpponent: boolean;
}): OnlineUiPhase;
```

### 6.2 導出優先順位

1. `room.status !== 'battle'` → ルーム UI に委譲
2. `replayOverlay != null` → `clashReplay` / `turnStartPoison`（**昇格・行動選択より優先**）
3. `getPendingPromotionFronts(localState.player).length > 0` → `promoteUnit` / `promoteSlot`（**`battle_phase` が select でも**）
4. 自分の昇格完了・相手未完了 → `waitOpponentPromotion`
5. `room.battlePhase === 'select'` かつ INV-1 成立 → `pickMain`（サブフェーズ: target/shield/heal）
6. `waitingForOpponent` → `waitOpponent`
7. バトル終了 → `ended`

### 6.3 入力ロック

| 条件 | 入力 |
|------|------|
| `promoteUnit` / `promoteSlot` | 昇格のみ有効 |
| `waitOpponent` / `waitOpponentPromotion` | ロック |
| `clashReplay` / `turnStartPoison` | ロック |
| `pickMain` かつ前衛空き | **あり得ない**（手順3が先。INV-1 前提） |

### 6.4 禁止事項

- `setUiPhase('pickMain')` でオンライン phase を命令的に切り替えない
- オフライン用 `useEffect`（自動 pass、昇格ガード）をオンラインに流用しない
- `effectivePhase` と `uiPhase` の二重管理

---

## 7. Clash 再生方針

### 7.1 v2 方針（推奨）

**クライアントで `resolveTurn` を再実行しない。**

| 項目 | 内容 |
|------|------|
| データ源 | `last_clash` + clash 前後の `battle_state`（revision で特定） |
| 再生 | サーバー確定済み `battle_state` の差分を **イベント列**として表示 |
| 最小 v2 | アニメ簡略化（短い演出 → 確定盤面表示）でも可。**再シミュレーションは禁止** |

### 7.2 将来（アニメ充実）

- `last_clash` に `playbackEvents: TurnPlaybackEvent[]` を追加する migration を検討
- サーバー `resolveOnlineClash` 内で `createTurnPlayback(result)` を生成し JSON 保存

### 7.3 毒 DoT（ターン開始）

- サーバー `applyTurnStart` 内で `startNextTurn` を実行し **結果 state を `battle_state` に反映してから select**
- クライアントは `battle_revision` 更新で新 state を受け取り、毒アニメは overlay のみ

---

## 8. 受け入れ条件

**すべて満たすまで v2 を merge しない。**

### 8.1 機能（2端末手動）

- [ ] ルーム作成 → 参加 → デッキ・配置 → バトル開始
- [ ] TURN 1: 両者行動選択 → clash 再生 → **昇格必要なら昇格 UI** → 行動選択
- [ ] **前衛空き + 後衛複数**: 「行動カードを選択」**より先に**昇格 UI。操作不能にならない
- [ ] 昇格 1択: 自動または 1タップで完了
- [ ] TURN 2 以降も同様
- [ ] 相手の昇格待ち表示
- [ ] 勝敗 → px 移動・Lost（勝者が墓地1枚選択）→ 再戦 or 退出

### 8.2 データ

- [ ] Supabase 上で `battle_phase='select'` かつ `onlinePromotionNeeded(battle_state)=true` の行が **存在しない**
- [ ] clash 後 `battle_revision` が単調増加

### 8.3 自動テスト

- [ ] `onlineBattleAuthority` — 昇格判定・1択自動・不変条件
- [ ] `deriveOnlineUiPhase` — select+昇格必要 → promoteUnit
- [ ] `roomApi` 結合 — mock Supabase で select→clash→promotion→select 一周期
- [ ] 回帰: guest flip 後も host と同じ promotion 必要性

---

## 9. v0 で失敗した Anti-Patterns

| # | やってはいけないこと | v0 で起きたこと |
|---|----------------------|-----------------|
| AP-1 | オフライン `useBattle` にオンライン分岐を足す | `setUiPhase` 31箇所、useEffect 地獄 |
| AP-2 | `battle_phase` と `uiPhase` の二重管理 | select 表示 + 昇格必要盤面 → 操作不能 |
| AP-3 | クライアントで clash を `resolveTurn` 再実行 | サーバー state とズレ、phase 飛ばし |
| AP-4 | `App.tsx` と `roomApi` の両方から clash 解決 | 競合・二重遷移 |
| AP-5 | クライアントから `advanceTurnStart` | タイミング競合、select 早送り |
| AP-6 | 不整合 detect → repair が本番経路 | 症状治療のループ |
| AP-7 | ユニットテスト pass = 完成 | 2端末で昇格前に pickMain |
| AP-8 | derive を `battlePhase === 'promotion'` だけに限定 | DB が select のまま UI だけ破綻 |

---

## 10. archive/online-pvp-v0 から残す資産

ブランチ `archive/online-pvp-v0` に凍結済み。v2 では **cherry-pick またはコピー** で段階移植する。

### 10.1 そのまま移植（高信頼）

| パス | 内容 |
|------|------|
| `supabase/migrations/005`〜`009` | ルーム表・RLS・join RPC・setup timer |
| `supabase/migrations/010` | `closed_by_role` |
| `supabase/migrations/011` | `battle_revision`, `battle_phase`, `last_clash`（**`clash_resolved` は check から削除**） |
| `supabase/migrations/012` | stale room cleanup |
| `supabase/migrations/013` | escrow 廃止 cleanup |
| `supabase/migrations/014` | `power_balance_applied` |
| `src/onlinePvp/constants.ts` | レベル・px・TTL 定数 |
| `src/onlinePvp/roomCode.ts` | ルームコード生成 |
| `src/onlinePvp/unlock.ts` | Lv10 解放 |
| `src/onlinePvp/stakes.ts` | px 移動計算 |
| `src/onlinePvp/battleSync.ts` | host state 生成・guest flip |
| `src/onlinePvp/deckPowerBalance.ts` | 戦力補正 |
| `src/onlinePvp/onlineBattleAuthority.ts` | 昇格判定・1択自動・不変条件 |
| `src/onlinePvp/types.ts` | 型（phase から `clash_resolved` 削除） |
| `src/onlinePvp/roomFlow.ts` | 再戦・deck_select 遷移 |
| `src/onlinePvp/display.ts` | 再戦ボタンラベル等 |
| `src/onlinePvp/setupTimer.ts` | 配置タイマー |

### 10.2 修正して移植（server 中心に整理）

| パス | v2 での変更 |
|------|-------------|
| `src/onlinePvp/roomApi.ts` | `advanceTurnStart` を private 化。promotion 完了後に内部連鎖。subscribe 側 resolve 削除。`repair*` は dev のみ |
| `src/onlinePvp/index.ts` | export 整理 |

### 10.3 参考にするが v2 では新規実装

| パス | 理由 |
|------|------|
| `src/components/useOnlineBattleSync.ts` | 責務過多。`useOnlineBattleSession` に置換 |
| `src/components/useOnlinePromotion.ts` | 新 derive に統合 |
| `src/onlinePvp/deriveOnlineBattleUi.ts` | 設計は参考。入力を **room 正本** に変更 |
| `src/onlinePvp/derivePromotionUi.ts` | 純関数として再利用可 |
| `src/components/useBattle.ts` オンライン分岐 | **移植しない** |
| `src/App.tsx` オンライン subscribe 内 clash | **削除** |

### 10.4 UI（段階移植）

| パス | 方針 |
|------|------|
| `src/components/OnlinePvpScreen.tsx` | ルーム待機・deck_select — 移植可 |
| `src/components/OnlinePvpBattleEndModal.tsx` | 移植可 |
| `src/components/BattleSetupScreen.tsx` オンライン分岐 | `useOnlineBattleSession` 接続に書き換え |
| `src/App.css` オンライン関連 | 必要分のみ |

### 10.5 移植コマンド例（実装フェーズ1）

```bash
# feature/online-pvp-v2 上で
git checkout archive/online-pvp-v0 -- supabase/migrations/005_online_battle_rooms.sql
# … 005〜014 を順に
git checkout archive/online-pvp-v0 -- src/onlinePvp/constants.ts
# … §10.1 のファイルを順に
```

migration は **番号順に Supabase へ適用**。既に DB に 005〜009 がある環境では 010〜014 のみ。

---

## 11. 実装フェーズ

| フェーズ | 内容 | 完了条件 |
|----------|------|----------|
| **P0** | 本仕様書 commit | `docs/online-pvp-spec.md` on v2 |
| **P1** | §10.1 資産移植 + migration 適用 | ルーム作成〜setup まで通る |
| **P2** | `roomApi` v2 整理（§3・§5） | 単体テスト: clash→promotion→select |
| **P3** | `useOnlineBattleSession` + `deriveOnlineUiPhase` | §6 導出テスト pass |
| **P4** | バトル UI 接続（`BattleSetupScreen`） | §8.1 前半 |
| **P5** | clash 再生（§7 最小） | 2端末 TURN 1〜2 |
| **P6** | 終了・経済・再戦 | §8 全項目 |

**各フェーズ末に commit**（日本語メッセージ）。merge は P6 完了後。

---

## 12. テスト要件

### 12.1 単体

- `onlineBattleAuthority.test.ts` — 昇格・不変条件
- `deriveOnlineUiPhase.test.ts` — phase 導出（**select + 昇格必要** を必須）
- `battleSync.test.ts` — guest flip
- `roomApi.test.ts`（新規）— mock client で状態遷移

### 12.2 結合

- 2クライアント mock が同一 room を subscribe → choice → promotion → select

### 12.3 手動

- §8.1 チェックリストを **実機2台** で記録（日付・revision をメモ）

---

## 13. 改訂履歴

| 版 | 日付 | 内容 |
|----|------|------|
| 1.0 | 2026-07-05 | 初版。v0 凍結後の v2 全面再設計。archive 資産整理 |
