# 簡単！真剣！お絵描きピクセルバトル！ / Easy! Serious! Pixel Art Battle!

**ウェブプロトタイプ** — React + Vite + TypeScript  
**Web prototype** — React + Vite + TypeScript

---

## ドキュメント / Documentation

| 日本語 | English | パス |
|--------|---------|------|
| 開発指示書 | Development spec | [`docs/PROTOTYPE_DEVELOPMENT_SPEC.md`](docs/PROTOTYPE_DEVELOPMENT_SPEC.md) |
| 属性・戦闘効果 | Attributes & combat | [`docs/ATTRIBUTE_SPEC.md`](docs/ATTRIBUTE_SPEC.md) |
| 経済・報酬 | Economy & rewards | [`docs/ECONOMY_SPEC.md`](docs/ECONOMY_SPEC.md) |
| 経済ロードマップ | Economy roadmap | [`docs/ECONOMY_ROADMAP.md`](docs/ECONOMY_ROADMAP.md) |
| 効果音（仕様のみ） | SFX spec (planned) | [`docs/SFX_SPEC.md`](docs/SFX_SPEC.md) |

---

## セットアップ / Setup

```bash
npm install
npm run dev
```

ブラウザで表示された URL を開く（通常 `http://localhost:5173`）。  
Open the URL shown in the terminal (usually `http://localhost:5173`).

### スマホで試す / Test on mobile

`npm run dev` 起動時、ターミナルに **Network** の URL（例: `http://192.168.x.x:5173`）も表示される。スマホを同じ Wi‑Fi に接続し、その URL をブラウザで開く。  
When dev server starts, use the **Network** URL (e.g. `http://192.168.x.x:5173`) on a phone connected to the same Wi‑Fi.

### PWA（ホーム画面に追加） / PWA (Add to Home Screen)

1. スマホの Safari で URL を開く / Open the URL in mobile Safari  
2. 共有 → **ホーム画面に追加** / Share → **Add to Home Screen**  
3. アイコンから起動すると全画面表示 / Launch from the icon for a standalone window  

アイコン更新: `public/app-icon-source.png` を編集 → `npm run generate:pwa-icons`  
To refresh icons: edit `public/app-icon-source.png`, then run `npm run generate:pwa-icons`.

本番ビルド（`npm run build`）では Service Worker が有効（HTTPS 推奨）。  
Production build enables the service worker (HTTPS recommended).

---

## スクリプト / Scripts

| コマンド / Command | 説明 / Description |
|--------------------|---------------------|
| `npm run dev` | 開発サーバー / Dev server |
| `npm run build` | 本番ビルド / Production build |
| `npm run preview` | ビルドのプレビュー / Preview production build |
| `npm test` | Vitest（571 tests） |
| `npm run lint` | ESLint |
| `npm run generate:pwa-icons` | PWA アイコン生成 / Generate PWA icons |

---

## ソース構成 / Source layout

```
src/
  types/            # Card, SaveData, ScreenId 等 / core types
  config/           # balance, economy, missions, permanentMissions
  card/             # カード生成・BP・限界突破 / card creation & BP
  game/             # 戦闘ロジック・CPU / combat & CPU
  mission/          # ミッション進捗・受取・表示 / missions engine
  user/             # プロフィール・経済・missionState / user state
  storage/          # localStorage 永続化 / persistence
  components/       # UI 画面 / screens & modals
  audio/            # BGM 再生 / background music
public/audio/       # BGM ファイル / BGM assets
docs/               # 仕様書 / specifications
```

---

## 主な機能（現状） / Main features (current)

### ゲームプレイ / Gameplay

- **5枚デッキ** CPU 戦・履歴再戦・Lost / 復活 / 思い出アルバム  
  **5-card decks**, CPU battles, history rematch, Lost / revive / memory album  
- **11属性** 戦闘（照属性含む） / **11 attributes** in combat (incl. Illuminate)  
- **ピクセルエディタ** レベル連動パレット・キャンバス拡大  
  **Pixel editor** with level-gated palette and canvas resize  

### 経済（2026-06 時点） / Economy (as of 2026-06)

| 項目 / Item | 値 / Value |
|-------------|------------|
| バトル勝利 px | 生存・墓地等 **×0.5**（`BATTLE_VICTORY_PX_MULTIPLIER`） |
| Battle victory px | Survivor & graveyard rewards **×0.5** |
| レベルアップ | **100 px + 💎10** / level |
| Level-up reward | **100 px + 10 jewels** / level |
| 属性リタッチ | **300 px** / Attribute retouch **300 px** |
| 属性セレクト | **💎100** / Attribute select **100 jewels** |
| リネーム | **200 px/回**（名前変更保存のたび） |
| Rename | **200 px** per save when the name changes |
| 復活 | 塗り×3×レア×★（`calcReviveCost`）、上限3回 |
| Revive | painted×3×rarity×stars (`calcReviveCost`), cap 3 |

詳細は [`ECONOMY_SPEC.md`](docs/ECONOMY_SPEC.md) を参照。  
See [`ECONOMY_SPEC.md`](docs/ECONOMY_SPEC.md) for full details.

### ミッション / Missions

| カテゴリ / Category | 概要 / Summary |
|---------------------|----------------|
| **デイリー / Daily** | 6件・日計 **45 px + 💎1**（5/10/15 px 段階） |
| **ウィークリー / Weekly** | 7件・週 **65 px + 💎10** |
| **常設 / Permanent** | 12カウンター + 全属性コンプ。各カテゴリ **20〜200** から開始、tier cap 受取で **+100** 自動拡張。一覧は **カテゴリ1件表示** |
| **ビギナー / Beginner** | 12 STEP チュートリアル（順次解放） |

定義: `src/config/missions.ts`, `src/config/permanentMissions.ts`  
Specs: [`PROTOTYPE §4.8`](docs/PROTOTYPE_DEVELOPMENT_SPEC.md#48-ミッション)

### その他 / Other

- Dock: マイデッキ / **ミッション** / バトル / ショップ / 所持品  
- BGM（設定で ON/OFF）、カードノート（プレミアム編集）  
- サブスク: ライト / プレミアム（プロトタイプ課金 UI）  

---

## 進捗 / Progress

- [x] 画面骨格・localStorage 永続化 / Screen shell & persistence  
- [x] カード作成・編集・デッキ / Card create, edit, deck  
- [x] 戦闘エンジン・CPU 戦・Lost 経済連動 / Combat, CPU, Lost economy  
- [x] 限界突破・ショップ・広告ゲート（モック） / Limit break, shop, ad gates  
- [x] ミッション（デイリー / ウィークリー / 常設 tier cap / ビギナー12） / Missions  
- [x] 経済リバランス（2026-06） / Economy rebalance (2026-06)  
- [ ] 効果音（SE） / Sound effects  
- [ ] オフライン対人（ゴースト） / Offline PvP (ghost decks)  

---

## ライセンス / License

Private prototype — 未公開 / Unreleased prototype.
