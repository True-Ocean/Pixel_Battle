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
4. **すでに 001 を実行済み**のプロジェクトでは、続けて `002_public_ghost_decks_record.sql` も実行する（対人戦の勝敗表示用）
5. アカウント連携（クラウドセーブ）を使う場合は `003_player_saves.sql` も実行する（**実行済みならスキップ**）

## 3.1 アカウント連携用の Auth URL（メール OTP）

1. **Authentication** → **URL Configuration**
2. **Site URL**（本番）:

```text
https://true-ocean.github.io/Pixel_Battle/
```

3. **Redirect URLs** に本番と開発を追加（メール内リンク用の予備。**完了の正はアプリ内コード入力**）:

```text
https://true-ocean.github.io/Pixel_Battle/**
http://localhost:5173/**
```

4. **Authentication** → **Providers** → **Email** が ON であること
5. Email OTP の桁数（例: 6〜8）を確認。アプリは 6〜8 桁の数字を受け付ける

クラウドセーブ API は `src/cloudSave/`（`fetchPlayerSave` / `upsertPlayerSave` / `reconcileCloudSave`）。

### アカウント連携（メール確認コード）

**完了手段はアプリ内の確認コード入力**（`verifyEmailOtp`）。ホーム画面に追加した PWA では、メール内リンクを開くと Safari にセッションが載り、PWA 側は未連携のままになる。

| ボタン | 用途 | 送信 API |
|--------|------|----------|
| **この端末を連携** | 未登録メールの新規登録〜連携 | `signInWithOtp`（`shouldCreateUser: true`） |
| **ログイン（復元用）** | 既に `auth.users` にあるメールで入り直す | `signInWithOtp`（`shouldCreateUser: false`） |

どちらも **Magic Link / OTP メール**（本文に `{{ .Token }}`）を使う。`updateUser` の Change Email メールはリンクのみでコードが無いため使わない。

1. 上記 URL Configuration と Email Provider が済んでいること
2. `003_player_saves.sql` 実行済みであること
3. アプリの **設定 → アカウント**（メール連携は折りたたみ）
4. メール送信 → **確認コードを同じアプリ画面に入力**（リンクは開かない）
5. 確認後の auth `user_id` はメールユーザー側。端末の `localStorage` セーブは残り、同期で `player_saves` へ上がる
6. 連携後はローカル保存が debounce 付きで自動同期。**今すぐ同期** でも手動実行可
7. **既に登録済みメールで「この端末を連携」した場合**: アプリがログイン用コード送信へ自動切替する（`email_already_registered`）
8. 端末ごとに連携完了メールは固定。**連携を解除**は端末の表示・セッション解除のみ（`auth.users` / `player_saves` は残る）。同じメールで再び使うときは **ログイン（復元用）**。アカウントごと消すのはダッシュボードの Users 削除、またはリリース前の「アカウント削除」

実装: `src/auth/`（`linkEmailToCurrentUser` / `signInWithEmailMagicLink` / `verifyEmailOtp`）・`src/cloudSave/sync.ts`（`hasPlayableProgress` / `resolveSyncDirection`）

#### 同期の安全策

| クラウド | 端末 | 動作 |
|----------|------|------|
| 行なし／進行なし | 進行あり | **端末をアップロード**（空で上書きしない） |
| 進行あり | 進行なし | クラウドをダウンロード |
| 両方進行あり | | `client_updated_at` の新しい方 |

`player_saves` が空でも `auth.users` にメールだけある状態は起こりうる（認証だけ先にできた場合）。そのときはログイン後に端末進行をアップロードする。

### 将来実装（リリース前）

プロトタイプではメール連携＋クラウド同期まで。次は **アプリ／ストア公開に近くなってから** 着手する。

| 項目 | 内容 | 備考 |
|------|------|------|
| **アカウント削除** | Auth ユーザー削除、`player_saves` 削除（CASCADE）、公開デッキ行の扱いを定義 | いまの「連携を解除」は端末紐づけ解除のみ。ストア審査では削除導線が求められることが多い |
| **Sign in with Apple** | OAuth。匿名セッションへの `linkIdentity` を維持 | iOS / App Store で外部ログインを出す場合にほぼ必須 |
| **Google ログイン** | OAuth。同上 | Web / Android 向け。Apple と併用可 |
| **日本語メール／独自 SMTP** | 確認メールの件名・本文を日本語化。必要なら SendGrid 等 | 無料枠の標準メールではテンプレート編集が制限される場合あり（Pro 等） |

方針の前提（現行実装と整合）:

- **完了はアプリ内 OTP**（`signInWithOtp` → `verifyEmailOtp`）。ホーム画面 PWA と Safari のストレージ分離を避ける
- 連携確認後の auth `user_id` はメールユーザー側（匿名 ID への `updateUser` 昇格は、Change Email にコードが無く PWA 非対応のため不採用）
- クラウドセーブは **メール連携済み** のときだけ同期する
- **空クラウドで端末進行を消さない**（上表）
- **連携を解除 ≠ アカウント削除**。解除後の再接続はログイン
- アカウント削除（リリース前）時は端末セーブの扱いを UI で明示する

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

未設定時は「公開デッキを表示できません」、通信失敗時は「公開デッキを取得できませんでした」と表示されます。取得成功で0件のときだけ「公開デッキがありません」です。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| 「Supabase が設定されていません」 | `.env` と dev サーバー再起動 |
| 「匿名ログインに失敗」 | Authentication → Anonymous が ON か |
| 公開は成功するが他端末に出ない | SQL マイグレーション実行済みか、RLS ポリシーがあるか |
| Status Unhealthy | 数分待って再読み込み。Paused なら Restore |
