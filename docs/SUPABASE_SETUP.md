# Supabase セットアップ（オフライン対人・公開デッキ）

フェーズ G（他ユーザーの公開デッキ共有）用の手順です。

## 1. プロジェクト作成

1. [supabase.com](https://supabase.com) で無料アカウントを作成
2. プロジェクトを作成（例: `Pixel-Battle`）
3. Security 推奨:
   - **Enable Data API**: ON
   - **Automatically expose new tables**: OFF
   - **Enable automatic RLS**: ON

## 2. 匿名ログインを有効化

ダッシュボードの表記は **Sign In / Providers** になっていることがあります。

1. 左メニュー **Authentication**
2. **Sign In / Providers**（または **Providers**）を開く
3. 一覧を**一番下までスクロール**する（Email / Phone / Google などの下にあります）
4. **Anonymous**（または **Anonymous Sign-Ins**）を探す
5. 行をクリックして開き、**Enable Anonymous sign-ins** を ON にして保存

見つからない場合:

- ページ上部の検索で `Anonymous` と入力する
- ブラウザで次の URL を開く（`YOUR_PROJECT_REF` は Project URL の `https://xxxx.supabase.co` の `xxxx` 部分）:

```text
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/providers
```

- それでも無い場合は、プロジェクトの **Settings → API** でリージョンとプランを確認し、ページをハードリロード（Cmd+Shift+R）する

## 3. テーブル作成

1. 左メニュー **SQL Editor** → **New query**
2. リポジトリの `supabase/migrations/001_public_ghost_decks.sql` の内容をすべて貼り付け
3. **Run** で実行

## 4. アプリに接続情報を渡す

1. **Project Settings** → **API**
2. **Project URL** と **Legacy anon public** キーをコピー
3. プロジェクト直下に `.env` を作成（`.env.example` をコピーしてよい）

```bash
cp .env.example .env
```

4. `.env` を編集:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...（anon public）
```

5. **service_role / secret キーは入れない**
6. `npm run dev` を**再起動**（環境変数は起動時に読み込まれます）

## 5. 動作確認

1. マイデッキでバトル可能なデッキ（ロストなし5枚）を用意
2. **対人戦に公開する** にチェック
3. 別のブラウザ／別端末（またはシークレットウィンドウ）で同じアプリを開き、別ユーザーとして対人戦一覧を見る
4. 公開したデッキが一覧に出る（自分の端末では自分の公開デッキは一覧に出ません）

未設定・通信失敗時は、従来どおり同梱サンプルデッキが一覧に出ます。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| 「Supabase が設定されていません」 | `.env` と dev サーバー再起動 |
| 「匿名ログインに失敗」 | Authentication → Anonymous が ON か |
| 公開は成功するが他端末に出ない | SQL マイグレーション実行済みか、RLS ポリシーがあるか |
| Status Unhealthy | 数分待って再読み込み。Paused なら Restore |
