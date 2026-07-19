# Supabase セットアップ（公開デッキ・クラウドセーブ・フレンド対戦）

オフライン対人の公開デッキ共有、アカウント連携（`player_saves`）、および **フレンド対戦（オンライン）** のルーム表用の手順です。

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
4. **すでに 001 を実行済み**のプロジェクトでは、続けて `002_public_ghost_decks_record.sql` も実行する（公開デッキ戦の勝敗表示用）
5. アカウント連携（クラウドセーブ）を使う場合は `003_player_saves.sql` も実行する（**実行済みならスキップ**）
6. **以前 003 を実行済み**で「permission denied for table player_saves」が出る場合は、`004_player_saves_grant.sql` を実行する

## 3.1 アカウント連携用の Auth（メール＋パスワード）

無料枠では **Email Templates を編集できない**ため、メール内確認コード（OTP）方式は使えません。  
アプリは **メールアドレス＋パスワード**で連携／ログインし、ホーム画面 PWA 内で完結します（メール内リンクは使いません）。

### 必須: Confirm email を OFF にする

1. Supabase ダッシュボード → **Authentication** → **Providers** → **Email**
2. **Confirm email**（メール確認）を **OFF** にして保存

ON のままだと `signUp` 後にセッションが返らず、アプリ内で連携を完了できません（確認メールもリンクのみで PWA 非対応）。

### Email Provider

1. **Authentication** → **Providers** → **Email** が ON
2. 上記どおり **Confirm email** が OFF
3. パスワード最小長は既定（6 文字）でよい。アプリも 6 文字以上を要求する

### URL Configuration（任意）

本番の Site URL などは他機能用に設定してよいが、パスワード連携の完了には不要です。

```text
https://true-ocean.github.io/Pixel_Battle/
```

クラウドセーブ API は `src/cloudSave/`（`fetchPlayerSave` / `upsertPlayerSave` / `reconcileCloudSave`）。

### アカウント連携（メール＋パスワード）

| ボタン | 用途 | API |
|--------|------|-----|
| **この端末を連携** | 未登録メールの新規登録〜連携 | `signUp`（`linkEmailToCurrentUser`） |
| **ログイン（復元用）** | 既に `auth.users` にあるメールで入り直す | `signInWithPassword`（`signInWithEmailPassword`） |

1. 上記 **Confirm email OFF** と Email Provider が済んでいること
2. `003_player_saves.sql` 実行済みであること
3. アプリの **設定 → アカウント**（メールアドレス連携は折りたたみ）
4. メールとパスワード（6 文字以上）を入力 → **この端末を連携** または **ログイン（復元用）**
5. 成功するとその場で連携完了（メール待ちなし）
6. 確認後の auth `user_id` はメールユーザー側。端末の `localStorage` セーブは残り、同期で `player_saves` へ上がる
7. 連携後はローカル保存が debounce 付きで自動同期。**クラウドに保存** / **クラウドから復元** で手動操作可（復元は端末に進行があるとき確認ダイアログ）
8. **既に登録済みメールで「この端末を連携」した場合**: 同じパスワードならログインにフォールバック。違う場合は「ログイン（復元用）」を案内
9. 連携済みユーザーは **アカウントを削除** からクラウドアカウント・セーブ・公開デッキを削除できる（下記 Edge Function 必須）。端末のゲームデータも初期化され、ユーザー名入力からやり直す

実装: `src/auth/`（`linkEmailToCurrentUser` / `signInWithEmailPassword` / `deleteAccount`）・`src/cloudSave/sync.ts`（`hasPlayableProgress` / `resolveSyncDirection`）

#### 同期の安全策

| クラウド | 端末 | 動作 |
|----------|------|------|
| 行なし／進行なし | 進行あり | **端末をアップロード**（空で上書きしない） |
| 進行あり | 進行なし | クラウドをダウンロード |
| 両方進行あり | | `client_updated_at` の新しい方 |

`player_saves` が空でも `auth.users` にメールだけある状態は起こりうる（認証だけ先にできた場合）。そのときはログイン後に端末進行をアップロードする。

## 3.2 フレンド対戦（オンライン）用テーブル

`online_battle_rooms` および関連 RPC・RLS は migration **005〜015** です。詳細は [online-pvp-spec.md](./online-pvp-spec.md)。

1. SQL Editor で `supabase/migrations/005_online_battle_rooms.sql` から **番号順**に実行（既に適用済みの番号はスキップ）
2. 一括適用の補助: `supabase/apply_migrations_010_014.sql`（010〜014）／`supabase/apply_migration_015_replica_identity.sql`（015）
3. **015 は必須**（`REPLICA IDENTITY FULL`）。未適用だと Realtime の部分 UPDATE で盤面が消えることがある
4. スキーマ確認: `supabase/verify_online_pvp_schema.sql`

Realtime で `online_battle_rooms` を購読する場合は、ダッシュボードの **Database → Replication**（または Publication）で当該テーブルが有効か確認する。

### アカウント削除（Edge Function）

設定の **アカウントを削除** は次を消します。

| 対象 | 動作 |
|------|------|
| `auth.users` | Edge Function から admin API で削除 |
| `player_saves` / `public_ghost_decks` | `auth.users` 削除で **CASCADE** |
| 端末 `localStorage` | 削除成功後にアプリ側でクリア → ユーザー名入力画面へ |

**初回セットアップ（1 回）**

1. [Supabase CLI](https://supabase.com/docs/guides/cli) をインストールし、プロジェクトにログイン
2. リポジトリ直下で Edge Function をデプロイ:

```bash
supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF
```

3. デプロイ後、Dashboard → **Edge Functions** → `delete-account` が表示されることを確認

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` は Supabase が Functions 実行環境に自動注入します。**service_role を `.env` やフロントに置かないこと。**

UI は二段階確認（削除内容の説明 → パスワード入力）です。

### 将来実装（リリース前）

プロトタイプではメールアドレス連携＋クラウド同期まで。次は **アプリ／ストア公開に近くなってから** 着手する。  
全体の進捗は [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) を更新する。

| 項目 | 内容 | 備考 |
|------|------|------|
| **Sign in with Apple** | OAuth。匿名セッションへの `linkIdentity` を維持 | iOS / App Store で外部ログインを出す場合にほぼ必須 |
| **Google ログイン** | OAuth。同上 | Web / Android 向け。Apple と併用可 |
| **日本語メール／独自 SMTP** | 将来 OTP や通知メールを使う場合の件名・本文日本語化 | 無料枠ではテンプレート編集不可のため、現状はパスワード認証 |

方針の前提（現行実装と整合）:

- **完了はアプリ内のメール＋パスワード**（`signUp` / `signInWithPassword`）。無料枠でもテンプレート編集不要で PWA 内完結
- **Confirm email は OFF**（必須）
- 連携確認後の auth `user_id` はメールユーザー側
- クラウドセーブは **メールアドレス連携済み** のときだけ同期する
- **バトル履歴（`battleHistory`）は端末専用**。アップロード時はキーごと含めない（空配列も書かない）。ダウンロード時は端末の履歴を維持する（`saveForCloudUpload` / `mergeLocalOnlyFields`）
- **空クラウドで端末進行を消さない**（上表）
- **アカウント削除** は Edge Function `delete-account` 経由。端末セーブも初期化する（UI で明示）

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
2. **公開デッキに登録する** にチェック
3. 別のブラウザ／別端末（またはシークレットウィンドウ）で同じアプリを開き、別ユーザーとして公開デッキ戦の一覧を見る
4. 公開したデッキが一覧に出る（自分の端末では自分の公開デッキは一覧に出ません）

未設定時は「公開デッキを表示できません」、通信失敗時は「公開デッキを取得できませんでした」と表示されます。取得成功で0件のときだけ「公開デッキがありません」です。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| 「Supabase が設定されていません」 | `.env` と dev サーバー再起動 |
| 「匿名ログインに失敗」 | Authentication → Anonymous が ON か |
| 公開は成功するが他端末に出ない | SQL マイグレーション実行済みか、RLS ポリシーがあるか |
| Status Unhealthy | 数分待って再読み込み。Paused なら Restore |
| 連携ボタンを押しても完了しない／確認メールを求められる | **Authentication → Providers → Email** で **Confirm email** が OFF か |
| メールまたはパスワードが正しくありません | 登録時と違うパスワード、または未登録メールでログインしていないか |
| **permission denied for table player_saves** | `003_player_saves.sql` 未実行、または GRANT 不足。SQL Editor で `004_player_saves_grant.sql`（または 003 全体）を実行 |
| アカウント削除が失敗／未設定メッセージ | `delete-account` Edge Function をデプロイ済みか。Network タブで `/functions/v1/delete-account` の応答を確認 |
| フレンド対戦で盤面が途中で消える／同期が壊れる | migration **015**（`REPLICA IDENTITY FULL`）適用済みか。`verify_online_pvp_schema.sql` で確認 |
