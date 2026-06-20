# 簡単！真剣！お絵描きピクセルバトル！ — ウェブプロトタイプ

## ドキュメント

- 開発指示書: [`docs/PROTOTYPE_DEVELOPMENT_SPEC.md`](docs/PROTOTYPE_DEVELOPMENT_SPEC.md)
- 属性・戦闘効果: [`docs/ATTRIBUTE_SPEC.md`](docs/ATTRIBUTE_SPEC.md)
- 経済・報酬: [`docs/ECONOMY_SPEC.md`](docs/ECONOMY_SPEC.md)
- 経済ロードマップ: [`docs/ECONOMY_ROADMAP.md`](docs/ECONOMY_ROADMAP.md)

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）を開く。

### スマホで試す

`npm run dev` 起動時、ターミナルに **Network** の URL（例: `http://192.168.x.x:5173`）も表示される。スマホを同じ Wi‑Fi に接続し、その URL をブラウザで開く。

### PWA（ホーム画面に追加）

1. スマホの Safari で上記 URL を開く
2. 共有ボタン → **ホーム画面に追加**
3. 追加したアイコンから起動すると、アドレスバーなしの全画面表示になる

アイコンを差し替えるときは `public/favicon.svg` を更新して `npm run generate:pwa-icons` を実行する。本番ビルド（`npm run build`）では Service Worker も有効になる（HTTPS 環境でオフラインキャッシュなど）。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルドのプレビュー |
| `npm test` | カード生成ロジックのテスト |

## ソース構成（Step 1）

```
src/
  types/          # Card, ScreenId 等
  config/         # balance.ts（調整定数）
  card/           # カード生成（Phase 2）
  game/           # 戦闘ロジック（Phase 4）
  storage/        # localStorage
  components/     # 画面
  data/           # CPU デッキ JSON
```

## 進捗

- [x] Step 1: Vite + React + TS、画面骨格、型・定数・保存の土台
- [x] Step 2: カード生成（解放済み属性からランダム抽選、キャンバス、デッキ追加）
- [x] 属性変更: カード詳細の属性リタッチ（200px）/ 属性セレクト（💎20）
- [x] 編集画面: 名前常時編集・保存時一括課金（リネーム + キャンバス拡大）
- [x] Step 3–5: 戦闘エンジン、3枚選択、CPU戦、仮ロスト、戦績
- [x] 盤面UI: CPU5枚見せ合い、BattleCard（BP右上・属性左下・盾・フォーカス）、クリック操作
