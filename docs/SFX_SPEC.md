# 簡単！真剣！お絵描きピクセルバトル！ — 効果音（SE）仕様書

| 項目 | 内容 |
|------|------|
| ドキュメント版 | 1.0 |
| 最終更新 | 2026-06-21 |
| 対象 | ウェブプロトタイプ（React + Vite + TypeScript） |
| 関連 | [プロトタイプ開発指示書](./PROTOTYPE_DEVELOPMENT_SPEC.md) / [属性・戦闘効果仕様](./ATTRIBUTE_SPEC.md) |
| 実装予定 | `src/config/sfx.ts` / `src/audio/sfxPlayer.ts` / `src/audio/useBattleSfx.ts` 等 |

---

## 目次

1. [目的とスコープ](#1-目的とスコープ)
2. [設計方針](#2-設計方針)
3. [SE 一覧（v1）](#3-se-一覧v1)
4. [再生タイミング](#4-再生タイミング)
5. [同時発火と優先度](#5-同時発火と優先度)
6. [ユーザー設定・BGM との関係](#6-ユーザー設定bgm-との関係)
7. [ファイル・ディレクトリ](#7-ファイルディレクトリ)
8. [実装構成](#8-実装構成)
9. [素材要件](#9-素材要件)
10. [意図的に鳴らさないもの](#10-意図的に鳴らさないもの)
11. [将来拡張](#11-将来拡張)
12. [実装チェックリスト](#12-実装チェックリスト)

---

## 1. 目的とスコープ

### 1.1 目的

- シンプルなプロトタイプのトーンを保ちつつ、**戦闘・勝敗・抽選**で必要な手応えだけを SE で補う。
- BGM（実装済み）と役割分担し、**属性ごとの細分化は v1 では行わない**。
- 実装者・素材制作者が参照する **単一の SE 仕様** とする。

### 1.2 現状（2026-06 時点）

| 区分 | 状態 |
|------|------|
| BGM | 実装済み（`Game_BGM.mp3` / `Battle.mp3`、`src/audio/bgmPlayer.ts`） |
| SE | **未実装**（本仕様書が初版） |
| 設定 | `SaveData.soundEnabled`（デフォルト ON）で BGM ON/OFF。**v1 では SE も同一フラグで制御** |
| 自動再生 | 初回 `pointerdown` / `keydown` で `bgmPlayer.unlock()`。**SE も同タイミングで unlock する** |

### 1.3 v1 の対象外

- 属性別 SE（剣 / 刀 / 弓 / 嵐 など個別ファイル）
- BGM と SE の音量を別設定で保存
- `game/` 戦闘ロジック層からの直接再生（UI 層のフックのみ）
- Unity 移植時の AudioMixer 設計（将来参考程度に留める）

---

## 2. 設計方針

### 2.1 ミニマル優先

| 原則 | 内容 |
|------|------|
| **少数** | v1 は **9 種類** の SE のみ（§3） |
| **1 音 = 1 意味** | 近接・弓・両・嵐はすべて `hit` / `block` を共用 |
| **短い** | 0.05〜0.4 秒が基本。`win` / `lose` のみ最大 1 秒 |
| **控えめ** | SE 音量は BGM より小さく（§6.2） |
| **毎ターン鳴らさない** | 毒 DoT・ターン開始・BP カウントダウンなどは SE なし |
| **操作音なし** | 行動カード選択・スロットタップの tick 音は v1 では付けない |

### 2.2 視覚演出との分担

攻撃演出は [PROTOTYPE §8.4](./PROTOTYPE_DEVELOPMENT_SPEC.md#84-ターン演出攻撃盾) のとおり **ダメージ数値 → BP カウントダウン** の 2 段階。SE は **ダメージ表示開始（`attackSubPhase: 'damage'`）** に合わせて鳴らす。BP フェーズでは原則 SE を追加しない（`status` は例外として BP フェーズ開始時に付与表示と同期してもよい — §4.3）。

---

## 3. SE 一覧（v1）

内部 ID（`SfxId`）・ファイル名・用途の対応。

| ID | ファイル名（案） | 用途 | 備考 |
|----|------------------|------|------|
| `hit` | `hit.mp3` | 攻撃がダメージを与えた | 剣・力・弓・両・嵐・反撃すべて共通 |
| `block` | `block.mp3` | 盾でダメージ 0 | `hit` と **必ず別音** |
| `status` | `status.mp3` | 毒付与・凍結付与 | 毒と氷は同一 SE。盾で防いだ場合は鳴らさない |
| `heal` | `heal.mp3` | 癒の回復・デバフ解除 | 回復量 0 でもデバフ解除なら鳴らす |
| `ko` | `ko.mp3` | ユニット撃破（BP → 0） | `hit` よりやや重い短い音 |
| `win` | `win.mp3` | バトル勝利 | WIN 表示と同時 |
| `lose` | `lose.mp3` | バトル敗北 | LOSE 表示と同時 |
| `roulette_tick` | `roulette_tick.mp3` | ルーレット回転中 | ロスト / 属性作成 / 属性リタッチ共通 |
| `roulette_stop` | `roulette_stop.mp3` | ルーレット確定 | 護符発動・レベルアップ表示も **v1 では流用可** |

**合計: 9 ファイル**

### 3.1 将来 v1.1 で追加検討（v1 必須ではない）

| ID | 用途 |
|----|------|
| `reward` | 勝利後の墓地カード選択確定時 |

---

## 4. 再生タイミング

### 4.1 バトル中 — 攻撃フェーズ

**フック:** `src/components/useBattle.ts` — `playback.phase === 'attack'` かつ `attackSubPhase === 'damage'` に遷移したとき。

対象: `playback.attacks[playback.attackIndex]`（`AttackPlayback` — `src/game/turnResult.ts`）

| 条件 | SE | 判定フィールド |
|------|-----|----------------|
| 主対象が盾で防いだ | `block` | `attack.blocked === true` |
| 主対象にダメージ | `hit` | `attack.damage > 0` |
| 毒または凍結を付与（盾で防いでいない） | `status` | `poisonGranted` / `poisonCounterGranted` / `iceGranted` / `iceCounterGranted` のいずれか |
| 主対象または攻撃側が BP 0 になった | `ko` | `attack.bpTo === 0` または `attack.attackerBpTo === 0` |

**v1 で鳴らさない攻撃関連:**

- 副攻撃のみ（`secondaryDamage` / `secondaryBlocked`）— 主対象の SE のみで足りる
- 攻撃側の反撃ダメージのみ（主対象と同フレームの `attackerDamage`）— 主対象 `hit` / `block` に含める
- `playback.phase === 'shield'`（盾付与）
- `playback.phase === 'illuminate'`（照）

**両属性・嵐:** `kind` が `dual` / `storm` でも上表と同じ。属性による分岐なし。

### 4.2 バトル中 — 癒フェーズ

**フック:** `playback.phase === 'heal'` かつ `healSubPhase === 'damage'` 開始時。

| 条件 | SE |
|------|-----|
| 癒が解決された | `heal` |

対象: `playback.heals` の当該ターン分（複数あっても **1 ターン 1 回** まで）。

### 4.3 バトル中 — ターン開始毒 DoT

**v1: SE なし**（`turnStartPlayback` / `uiPhase === 'turnStartPoison'`）。視覚演出（紫オーバーレイ・ダメージ表示）で足りる。

### 4.4 バトル終了

**フック:** `BattleSetupScreen` 内で `battle.effectivePhase === 'ended'` かつ `battle.result != null` になった **初回のみ**。

| 条件 | SE |
|------|-----|
| `result === 'player'` | `win` |
| `result === 'cpu'` | `lose` |

WIN / LOSE オーバーレイ（`formation-outcome-badge`）と同タイミング。

### 4.5 ロストルーレット

**コンポーネント:** `src/components/LostRouletteModal.tsx`

| タイミング | SE | 定数 |
|------------|-----|------|
| ハイライトが切り替わるたび（`remaining > 4`） | `roulette_tick` | `SPIN_MS = 80` |
| 減速区間（`remaining <= 4`） | **鳴らさない**（tick 省略で十分） |
| `phase` が `result` に変わった瞬間 | `roulette_stop` | — |

### 4.6 属性ルーレット（作成・リタッチ）

| コンポーネント | tick | stop |
|----------------|------|------|
| `AttributeCreateRouletteModal.tsx` | 属性表示が切り替わるたび（`SPIN_INTERVAL_MS = 90`） | `phase === 'confirmed'` へ遷移時 |
| `AttributeRetouchModal.tsx` | 同上 | `phase === 'confirmed'` へ遷移時 |

ロストルーレットと **同一 SE ファイル** を使用する。

### 4.7 護符・レベルアップ（v1）

| 画面 | SE |
|------|-----|
| `TalismanSaveModal` 表示 | `roulette_stop` を流用（専用 SE は v1 不要） |
| `LevelUpModal` 表示 | `roulette_stop` を流用 |

---

## 5. 同時発火と優先度

同一 `attackSubPhase === 'damage'` 内で複数条件が成立しうる。**1 攻撃あたり鳴らす SE は最大 2 つ**（メイン 1 + 付随 1）。

### 5.1 メイン SE（排他）

優先度 **高 → 低**:

1. `block`（盾で 0）
2. `hit`（ダメージ > 0）

### 5.2 付随 SE（メインと併用可）

- `status` — メインが `block` のときは **鳴らさない**
- `ko` — BP 0 になった側がいれば **メイン SE に加えて** 鳴らす（`hit` + `ko` など）

### 5.3 例

| 状況 | 鳴る SE |
|------|---------|
| 100 ダメージ、撃破 | `hit` + `ko` |
| 盾で防いだ | `block` のみ |
| 100 ダメージ + 毒付与 | `hit` + `status` |
| 盾で防いで毒も防いだ | `block` のみ |
| 0 ダメージ（凍結相手など、盾以外） | なし（`status` のみ付与なら `status` のみ） |

### 5.4 連続攻撃

`attackIndex` が進むたびに上記を繰り返す。前の SE 再生中に次が来ても **上書き再生**（プール 1 要素でも可）でよい。

---

## 6. ユーザー設定・BGM との関係

### 6.1 設定フラグ

| 項目 | v1 の扱い |
|------|-----------|
| `SaveData.soundEnabled` | BGM + SE 共通。`false` なら SE も再生しない |
| SE 専用 OFF | **v1 では実装しない**（将来 `sfxEnabled` を追加可） |

設定 UI: `SettingsScreen` の「サウンド」トグル（既存）。文言変更は任意。

### 6.2 音量

| 定数（案） | 初期値 | 説明 |
|------------|--------|------|
| `BGM_VOLUME` | `0.5` | 既存（`src/config/bgm.ts`） |
| `SFX_VOLUME` | `0.3` | SE 全体。BGM より小さく |

`win` / `lose` も同じ `SFX_VOLUME` を使用（個別ゲイン調整は v1 不要）。

### 6.3 自動再生ポリシー

- `bgmPlayer.unlock()` と同時に `sfxPlayer.unlock()` を呼ぶ（`useBgm.ts` または共通 `audioUnlock` に集約可）。
- `soundEnabled === false` のとき `play()` は no-op。
- モバイル: ユーザー操作の同期コンテキスト内での初回 unlock を維持（`App.tsx` の `handleSoundEnabledChange` も同様）。

---

## 7. ファイル・ディレクトリ

### 7.1 配置

```
public/
  audio/
    Game_BGM.mp3      # 既存
    Battle.mp3        # 既存
    sfx/
      hit.mp3
      block.mp3
      status.mp3
      heal.mp3
      ko.mp3
      win.mp3
      lose.mp3
      roulette_tick.mp3
      roulette_stop.mp3
```

### 7.2 形式・PWA

| 項目 | 内容 |
|------|------|
| 形式 | **mp3**（BGM と統一） |
| 配信 | `import.meta.env.BASE_URL` 経由（`bgmPlayer` と同パターン） |
| PWA | `vite.config.ts` の `includeAssets` / `globPatterns` に `audio/sfx/*.mp3` を追加 |

### 7.3 設定マスタ（案）

`src/config/sfx.ts`:

```ts
export const SFX_PATHS = {
  hit: 'audio/sfx/hit.mp3',
  block: 'audio/sfx/block.mp3',
  // ...
} as const;

export type SfxId = keyof typeof SFX_PATHS;
export const SFX_VOLUME = 0.3;
```

---

## 8. 実装構成

### 8.1 推奨モジュール

| パス | 責務 |
|------|------|
| `src/config/sfx.ts` | ID・パス・音量定数 |
| `src/audio/sfxPlayer.ts` | `play(id)`, `setEnabled()`, `unlock()`, `preload()` |
| `src/audio/useBattleSfx.ts` | `useBattle` の `playback` / `turnStartPlayback` を監視 |
| `src/audio/useBgm.ts` | unlock 時に `sfxPlayer.unlock()` を呼ぶ（または `audioUnlock.ts`） |

**原則:** `src/game/` から SE を呼ばない。React コンポーネント / フックのみ。

### 8.2 sfxPlayer API（案）

```ts
class SfxPlayer {
  setEnabled(enabled: boolean): void;
  unlock(): void;
  preload(ids?: SfxId[]): void;
  play(id: SfxId): void;
}
export const sfxPlayer = new SfxPlayer();
```

- 各 ID ごとに `HTMLAudioElement` を 1 つ保持。`play()` 時は `currentTime = 0` して `play()`（短い SE なので上書きで十分）。
- 将来、同時多発が問題になったら ID ごとに 2 要素プールに拡張。

### 8.3 フック配置

| 監視対象 | 配置 |
|----------|------|
| 攻撃・癒 | `useBattleSfx(playback, uiPhase, soundEnabled)` を `BattleSetupScreen` または `useBattle` 利用側 |
| 勝敗 | `BattleSetupScreen` の `ended` 検知 `useEffect` |
| ルーレット各 Modal | 各 Modal 内の `setInterval` / `phase` 遷移 |
| 設定連動 | `App.tsx` で `sfxPlayer.setEnabled(soundEnabled)` |

### 8.4 テスト方針

- `sfxPlayer`: `play` が enabled/unlock 状態で呼ばれるかをユニットテスト（Audio を mock）。
- 戦闘: 既存 `game/` テストは変更しない。SE フックは UI 層の結合テストまたは手動確認。

---

## 9. 素材要件

### 9.1 音のイメージ（v1）

| ID | イメージ |
|----|----------|
| `hit` | 短い打撃・8-bit 風インパクト |
| `block` | 金属 / 盾の「カン」 |
| `status` | 低めの魔法音・毒泡 / 凍結キーンの中間 |
| `heal` | 明るい短いチャイム |
| `ko` | `hit` より低く短い落下音 |
| `win` | 0.5〜1 秒の短い勝利ジングル |
| `lose` | 0.5〜1 秒の短い敗北音（暗すぎない） |
| `roulette_tick` | 極短の blip（50ms 程度） |
| `roulette_stop` | tick より低い確定音 |

BGM（`Game_BGM` / `Battle`）と **トーンを合わせる**（レトロ / 軽快寄り）。

### 9.2 入手方針（プロトタイプ）

- 無料 CC0 パック（Kenney 等）+ jsfxr / ChipTone で tick 系を自作。
- 詳細な素材調達手順は本仕様の対象外。ライセンス（商用可・クレジット要否）を必ず確認する。

### 9.3 プレースホルダー

実装を先に進める場合、同一ファイルのコピーでも可。`SFX_PATHS` と `sfxPlayer` を先に配線し、後から差し替える。

---

## 10. 意図的に鳴らさないもの

v1 およびミニマル方針により **SE を付けない** イベント一覧。

| カテゴリ | イベント |
|----------|----------|
| 操作 | 行動カード選択、対象タップ、配置、補充スロット選択 |
| ターン | ターン開始、行動確定、CPU 思考 |
| 状態 | 毒 DoT（毎ターン）、凍結自然解除、ステルス開始/解除、照 |
| 支援 | 盾付与 |
| 準備 | マッチング、カウントダウン 3-2-1 |
| 攻撃細分 | 属性別音、副攻撃のみ、相打ち専用、反撃専用 |
| 演出 | BP カウントダウン tick、カード揺れ |
| 経済 | 墓地選択確定、ミッション達成、ショップ購入 |
| その他 | タイトル画面、画面遷移、ボタンクリック |

---

## 11. 将来拡張

### 11.1 v2 候補（需要が確認できたら）

- `reward` — 墓地戦利品選択
- `sfxEnabled` / `sfxVolume` — BGM と独立設定
- 属性別 `hit` バリアント（最大 3〜4 種に抑える）
- `storm_cast` — 嵐のみ詠唱音

### 11.2 Unity 移植時

- 本仕様の `SfxId` を C# enum の seed として流用可。
- 戦闘イベント（`AttackPlayback` 等）と SE の対応表（§4）は Unity 側でも同じ条件式を使える。

### 11.3 将来属性（ATTRIBUTE_SPEC §11）

爆・呪・替などが実装された段階で、**新 ID を追加する前に** 既存 `hit` / `status` で足りないか検証する。

---

## 12. 実装チェックリスト

### Phase 1 — 基盤

- [ ] `public/audio/sfx/` に 9 ファイル（またはプレースホルダー）
- [ ] `src/config/sfx.ts`
- [ ] `src/audio/sfxPlayer.ts`
- [ ] `useBgm` / `App.tsx` で unlock・setEnabled 連携
- [ ] `vite.config.ts` PWA に sfx パス追加

### Phase 2 — バトル

- [ ] `useBattleSfx` — 攻撃 `damage` フェーズ（§4.1・§5）
- [ ] `useBattleSfx` — 癒 `damage` フェーズ（§4.2）
- [ ] `BattleSetupScreen` — 勝敗（§4.4）

### Phase 3 — ルーレット

- [ ] `LostRouletteModal` — tick / stop（§4.5）
- [ ] `AttributeCreateRouletteModal` — tick / stop（§4.6）
- [ ] `AttributeRetouchModal` — tick / stop（§4.6）

### Phase 4 — 確認

- [ ] `soundEnabled === false` で SE 無音
- [ ] スマホ実機（初回タップ後に SE 鳴る）
- [ ] BGM と SE の音量バランス
- [ ] 両攻撃・嵐 2 体でも「うるさすぎない」こと

---

## 決定履歴

| 版 | 日付 | 内容 |
|----|------|------|
| 1.0 | 2026-06-21 | 初版。v1 ミニマル 9 SE・再生タイミング・実装構成を定義 |
