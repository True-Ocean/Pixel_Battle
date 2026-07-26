# アプリリリース進め方（ステップバイステップ）

**目的**: Web プロトタイプ（GitHub Pages / PWA）から、まず **iOS（App Store）** 公開へ進むための順序付き計画。  
**運用**: フェーズ完了ごとにチェックを付ける。詳細の確認項目は [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) を正とする。  
**関連**: [ECONOMY_ROADMAP.md](./ECONOMY_ROADMAP.md) / [ECONOMY_SPEC.md](./ECONOMY_SPEC.md) / [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) / [PROTOTYPE_DEVELOPMENT_SPEC.md](./PROTOTYPE_DEVELOPMENT_SPEC.md)

| 項目 | 内容 |
|------|------|
| 現行スタック | React + Vite + TypeScript、PWA（`vite-plugin-pwa`）、Supabase、GitHub Pages（`base: /Pixel_Battle/`） |
| 推奨アプリ化手段 | **Capacitor**（既存 Web を WKWebView で包む）。React Native 書き直しは非推奨 |
| 収益の本番経路 | 広告 → **AdMob リワード** / 💎・サブスク → **StoreKit**（Web モック課金とは別） |
| 前提認識 | 広告・独自ドメインを **全部揃えてからでないと iOS に触れないわけではない**。一方で **ストア公開・本番収益化の直前には必須** |

---

## 全体像

```
Phase 0 方針決定
    ↓
Phase 1 法務・公開 URL（ポリシー等）
    ↓
Phase 2 広告アダプタ化（モック維持）     ←── 並行可: アカウント開設（Apple / AdMob）
    ↓
Phase 3 Capacitor iOS シェル + TestFlight
    ↓
Phase 4 本番広告（AdMob）+ 本番課金（StoreKit）
    ↓
Phase 5 認証・本番インフラ固め
    ↓
Phase 6 App Store 申請・公開
    ↓
Phase 7 公開後運用（任意で Android）
```

**Web / PWA は当面維持**する。ネイティブアプリは端末内の静的ファイルを読むため、Pages 上の Web 版と併存できる。

---

## Phase 0 — 方針決定

**ゴール**: 「何を・どの順で出すか」を一文で固定する。

- [ ] リリース対象を決める（推奨例: **iOS 先行（Capacitor）** / Web・PWA は並行維持 / Android は後）
- [ ] 本番の顔となる URL 方針を決める（独自ドメイン推奨。当面は Pages + ポリシー用ページでも可）
- [ ] 収益方針を確認する  
  - 広告: AdMob リワード（[ECONOMY_ROADMAP フェーズ 7b](./ECONOMY_ROADMAP.md)）  
  - 課金: App Store では StoreKit が正（モックショップは体験確認用）
- [ ] Apple Developer Program（年額）への加入時期を決める（TestFlight から必要）
- [ ] [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) の「0. ドキュメント・方針」を同期する

**完了の目安**: README または本ドキュメント先頭に、リリース対象の一文が残っている。

---

## Phase 1 — 法務・公開 URL

**ゴール**: App Store / AdMob / 問い合わせで使える **安定した HTTPS の公開ページ** がある。

アプリ本体の配信 URL と、ポリシー用 URL は **別でもよい**。

| 用意するもの | 用途 |
|--------------|------|
| プライバシーポリシー | App Store・AdMob・課金でほぼ必須 |
| 利用規約 | 推奨〜実質必須に近い |
| サポート連絡先（メール or フォーム） | App Store のサポート URL |
| （任意）紹介用ランディング | 審査・SNS・広告アカウント用 |

作業ステップ:

1. [ ] 文言の下書き（収集データ: アカウント、クラウドセーブ、広告 ID、購入、クラッシュ等）
2. [ ] 公開場所を決める  
   - GitHub Pages + **独自ドメイン**、または  
   - ポリシーだけ別ホスト（Cloudflare Pages 等）
3. [ ] 本番 URL を確定し、Supabase の **Site URL / Redirect URLs** 更新計画をメモする（実装は Phase 5）
4. [ ] [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) のポリシー・サポート項目を更新する

**完了の目安**: ブラウザでポリシー／規約／サポートに到達できる固定 URL がある。

---

## Phase 2 — 広告アダプタ化（モックのまま）

**ゴール**: UI・頻度・会員スキップはそのままに、本番 SDK へ **差し替え可能な層** を用意する。  
本番 AdMob の埋め込みは **Phase 4** でよい。アカウント開設だけ先に進めてよい。

現状: `MockRewardAdModal` と `adState` でモック運用（勝利2倍・CPU 戦 3回に1回・履歴再戦など）。仕様は [ECONOMY_SPEC §11](./ECONOMY_SPEC.md#11-広告)。

作業ステップ:

1. [ ] `showRewardedAd(): Promise<'completed' | 'skipped' | 'failed'>` 相当のアダプタを用意する（[ECONOMY_ROADMAP フェーズ 7](./ECONOMY_ROADMAP.md)）
2. [ ] 呼び出し箇所（バトル開始・履歴再戦・勝利2倍・編集前など）をアダプタ経由に寄せる
3. [ ] Web / iOS で実装を差し替えられる分岐の置き場所を決める  
   - iOS: Capacitor + AdMob プラグイン  
   - Web: リワード制約が大きい → **Web は弱め / アプリで本収益** も選択肢
4. [ ] 仕様残の扱いを決める（創作保存ゲート `hasEverCompletedBattleDeck` など）。ストア前に閉じるか、意図的に後回しにするか文書化する
5. [ ] （並行）AdMob アカウント開設・テスト用アプリ／広告ユニットの準備開始

**完了の目安**: モックのまま全広告導線がアダプタ経由で動き、SDK 差し替え箇所が 1 箇所に近い。

---

## Phase 3 — Capacitor で iOS シェル + TestFlight

**ゴール**: 既存ビルドが **実機のネイティブアプリ** として起動し、主要フローを通せる。

作業ステップ:

1. [ ] Capacitor を導入し、`ios` プロジェクトを生成する
2. [ ] **ネイティブ用ビルドは `base: '/'`**（Pages 用 `/Pixel_Battle/` と設定を分ける）
3. [ ] スプラッシュ・アプリアイコン・向き（portrait）・Status Bar / Safe Area を整える
4. [ ] 実機で通し確認  
   - 新規〜創作〜デッキ〜CPU 戦〜クラウド連携〜（可能なら）フレンド対戦
5. [ ] 入力フォーカス時の拡大、音声、オフライン時の見え方を確認する
6. [ ] Apple Developer 登録済みなら **TestFlight** で内部配布
7. [ ] Web 版（Pages）とネイティブ版の併存ルールを短くメモする（環境変数・`base`・広告分岐）

**完了の目安**: TestFlight（または実機デバッグ）で、広告モックのまま主要プレイが通る。

---

## Phase 4 — 本番広告 + 本番課金

**ゴール**: 収益導線がストア審査に耐える実装になる。

### 4.1 広告（AdMob）

1. [ ] Capacitor 向け AdMob プラグインでリワードを接続する
2. [ ] Phase 2 のアダプタを本番実装に差し替える（テスト ID → 本番 ID）
3. [ ] 失敗・スキップ時の UX（報酬を出さない／リトライ）を仕様どおりにする
4. [ ] サブスクによる広告解除（ライト / プレミアム）が本番でも正しいことを確認する

### 4.2 課金（StoreKit）

1. [ ] App Store Connect で商品（💎・サブスク）を定義する
2. [ ] モック購入を StoreKit に置き換える（復元購入・期限切れ・キャンセル）
3. [ ] 設定画面の **テスト指標**（課金額累計・広告視聴回数）を本番から外す／非表示にする
4. [ ] サンドボックスアカウントで購入〜特典反映を確認する

**完了の目安**: テスト広告・サンドボックス課金で、ECONOMY 仕様の主要ループがネイティブ上で完結する。

---

## Phase 5 — 認証・本番インフラ

**ゴール**: 一般公開してもアカウント・データ・削除が破綻しない。

優先度の高いもの（詳細は [RELEASE_CHECKLIST](./RELEASE_CHECKLIST.md) / [SUPABASE_SETUP](./SUPABASE_SETUP.md)）:

1. [ ] 本番 Supabase: 独自 SMTP、Confirm email OFF、マイグレーション適用、RLS 確認
2. [ ] `delete-account` Edge Function を本番デプロイし、設定からの削除導線を確認する
3. [ ] Auth の Site URL / Redirect URLs を本番ドメインに合わせる
4. [ ] **Sign in with Apple**（他社ログインを出す場合はほぼ必須）
5. [ ] （任意）Google ログイン
6. [ ] GitHub Actions / 環境変数に `service_role` が混入していないこと
7. [ ] 開発メニュー（DEV）が本番ビルドに出ないこと
8. [ ] クラウドセーブ: 空クラウドで端末進行を消さない／別端末復元

**完了の目安**: チェックリスト §1〜§2・§5 の必須項目が `[x]` になっている。

---

## Phase 6 — App Store 申請・公開

**ゴール**: 審査提出〜公開。

1. [ ] App Store Connect のメタデータ  
   - 名前・説明・キーワード・カテゴリ・年齢レーティング  
   - スクリーンショット（必須サイズ）  
   - プライバシー栄養ラベル / データ収集の申告  
   - サポート URL・プライバシーポリシー URL（Phase 1）
2. [ ] アカウント削除の説明が審査で分かる（設定内導線）
3. [ ] 広告・課金・ログインを含む **審査用手順メモ**（デモアカウント等）を用意する
4. [ ] 提出ビルドを TestFlight で最終通しプレイする
5. [ ] 申請 → リジェクト時は指摘を本ドキュメントの追記ログに残す
6. [ ] 公開後、Web 版との案内（「アプリ版はこちら」等）を必要なら更新する

**完了の目安**: App Store で一般公開（または段階的公開）されている。

---

## Phase 7 — 公開後・拡張（任意）

公開後に回してよいもの:

- [ ] 監視: Supabase 利用量アラート、障害時連絡手段、問い合わせ FAQ
- [ ] クリエイティブ改善・バランス調整（ECONOMY パラメータ）
- [ ] Android（同じく Capacitor）への展開
- [ ] Web 版の広告方針の再検討（出さない／別手段）
- [ ] PWA ホーム画面追加の案内をヘルプに残すか整理する

---

## 何を「今すぐ」やってよいか / 何を後回しにしてよいか

| 作業 | タイミング |
|------|------------|
| Capacitor 導入・TestFlight | **今すぐ始めてよい**（広告なしでも検証可能） |
| 広告アダプタ化（モック維持） | **早めに推奨**（後の差し替えコストを下げる） |
| プライバシーポリシー等の公開 URL | **申請・AdMob 本登録の前** |
| 独自ドメイン | **強く推奨**（ポリシーだけ先でも可） |
| 本番 AdMob | **iOS シェルの後**（Phase 4） |
| StoreKit 本番課金 | **申請直前〜審査用ビルド**（Phase 4〜6） |
| Sign in with Apple | 外部ログインを出すなら **申請前**（Phase 5） |

---

## 直近 2〜4 週間の推奨アクション

1. Phase 0: リリース対象を「iOS 先行（Capacitor）」と文書化する  
2. Phase 1: プライバシーポリシー / 利用規約の下書きと公開場所を決める  
3. Apple Developer・AdMob のアカウントだけ先に作る（実装は後）  
4. Phase 2: `showRewardedAd` アダプタ化（モック維持）  
5. Phase 3: Capacitor のスパイク（既存ビルドを実機表示 → TestFlight）

---

## 成果物とドキュメントの役割分担

| ドキュメント | 役割 |
|--------------|------|
| **本ファイル（APP_RELEASE_PLAN）** | **順序付きの進め方**・フェーズのゴール |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | **網羅的な確認チェック**（気づいたら追記） |
| [ECONOMY_ROADMAP.md](./ECONOMY_ROADMAP.md) | 経済・広告・課金の実装フェーズ |
| [ECONOMY_SPEC.md](./ECONOMY_SPEC.md) | 経済・広告の仕様の正 |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | 認証・クラウド・Edge Function |

---

## 追記ログ

| 日付 | 内容 |
|------|------|
| 2026-07-26 | 初版。iOS（Capacitor）先行・広告アダプタ→シェル→AdMob/StoreKit→申請の順序を固定 |
