# muscle-tracker

[![RSpec](https://github.com/tiwakawa/muscle-tracker/actions/workflows/rspec.yml/badge.svg)](https://github.com/tiwakawa/muscle-tracker/actions/workflows/rspec.yml)
[![Frontend CI](https://github.com/tiwakawa/muscle-tracker/actions/workflows/frontend.yml/badge.svg)](https://github.com/tiwakawa/muscle-tracker/actions/workflows/frontend.yml)

筋トレ・体重記録アプリ。スマートフォンに最適化したモバイルファーストのWebアプリです。

## 画面イメージ

| ダッシュボード | ワークアウト一覧 | ワークアウト記録 | ボディ記録 |
|---|---|---|---|
| 体重グラフ・直近の記録 | セット詳細表示・編集削除 | 日付/コンディション/セット入力 | 体重・体脂肪グラフ |

---

## 技術スタック

### バックエンド
| 技術 | バージョン |
|---|---|
| Ruby | 3.3 |
| Rails | 8.1 (API mode) |
| MySQL | 8.0 |
| devise_token_auth | トークン認証 |

### フロントエンド
| 技術 | バージョン |
|---|---|
| Next.js | 14 (App Router) |
| TypeScript | 5 |
| Tailwind CSS | 3 |
| Recharts | グラフ描画 |

### インフラ・開発環境
- Docker Compose
- DevContainer (VS Code)

---

## ローカル開発環境のセットアップ

### 前提条件

- Docker Desktop
- VS Code + [Dev Containers 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### 手順

**1. リポジトリをクローン**

```bash
git clone https://github.com/tiwakawa/muscle-tracker.git
cd muscle-tracker
```

**2. DevContainer で開く**

VS Code でフォルダを開き、右下に表示される「Reopen in Container」をクリック。
または、コマンドパレット（`Cmd+Shift+P`）から「Dev Containers: Reopen in Container」を実行。

初回はDockerイメージのビルドと依存パッケージのインストールが自動で行われます（数分かかります）。

**3. データベースのセットアップ**

DevContainer 内のターミナルで実行：

```bash
cd /workspace/backend
bundle exec rails db:create db:migrate db:seed
```

`db:seed` でエクササイズマスタ17件が投入されます。

**4. 動作確認**

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3001 |
| バックエンド (API) | http://localhost:3000 |
| MySQL | localhost:3306 |

---

## API 一覧

### 認証

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth` | 新規登録 |
| POST | `/auth/sign_in` | ログイン |
| DELETE | `/auth/sign_out` | ログアウト |

認証済みリクエストにはヘッダーに `access-token` / `client` / `uid` を付与してください。

### ユーザー

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/me` | ログイン中ユーザー情報取得 |

### エクササイズ

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/exercises` | 一覧取得 |
| POST | `/api/v1/exercises` | 作成 |
| GET | `/api/v1/exercises/:id` | 詳細取得 |
| PUT | `/api/v1/exercises/:id` | 更新 |
| DELETE | `/api/v1/exercises/:id` | 削除 |

### ワークアウト

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/workouts` | 一覧取得（セット・種目情報込み） |
| POST | `/api/v1/workouts` | 作成 |
| GET | `/api/v1/workouts/:id` | 詳細取得 |
| PUT | `/api/v1/workouts/:id` | 更新 |
| DELETE | `/api/v1/workouts/:id` | 削除 |

### ワークアウトセット

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/workouts/:workout_id/workout_sets` | 一覧取得 |
| POST | `/api/v1/workouts/:workout_id/workout_sets` | 作成 |
| PUT | `/api/v1/workouts/:workout_id/workout_sets/:id` | 更新 |
| DELETE | `/api/v1/workouts/:workout_id/workout_sets/:id` | 削除 |

### ボディ記録

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/body_records` | 一覧取得 |
| POST | `/api/v1/body_records` | 作成 |
| GET | `/api/v1/body_records/:id` | 詳細取得 |
| PUT | `/api/v1/body_records/:id` | 更新 |
| DELETE | `/api/v1/body_records/:id` | 削除 |

### エクスポート

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/v1/export` | 今月のデータを Google Sheets へエクスポート |

---

## 画面構成

```
/login          ログイン・新規登録
/               ダッシュボード（体重グラフ・直近ワークアウト）
/workouts       ワークアウト一覧（種目・セット詳細表示、編集・削除）
/workouts/new   ワークアウト記録（日付・コンディション・メモ・セット入力）
/workouts/:id/edit  ワークアウト編集（セットの追加・更新・削除）
/body           ボディ記録（体重・体脂肪グラフ、履歴一覧）
```

### コンポーネント構成

```
src/
├── app/                    # Next.js App Router ページ
├── components/
│   ├── ProtectedPage.tsx   # 認証ガード + ヘッダー + BottomNav ラッパー
│   ├── BottomNav.tsx       # ボトムナビゲーション
│   └── WeightChart.tsx     # Recharts 折れ線グラフ
└── lib/
    ├── api.ts              # fetch ラッパー（トークン自動管理）
    └── types.ts            # 型定義
```

---

## データベース構成

```
users           devise_token_auth が管理
exercises       name(unique), category(enum), ...
workouts        user_id, date, condition(1-5), memo, ...
workout_sets    workout_id, exercise_id, set_number, weight, reps, ...
body_records    user_id, date, weight, body_fat_percentage, ...
```

エクササイズカテゴリ: `chest` / `back` / `shoulders` / `arms` / `legs` / `core` / `cardio` / `other`

---

## Google Sheets 連携セットアップ

ダッシュボードの「今月をSheetに同期」ボタンを使うには、以下の手順でGoogle Cloud の設定が必要です。

### 1. Google Cloud Console でプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「プロジェクトを作成」から新規プロジェクトを作成

### 2. Google Sheets API を有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. 「Google Sheets API」を検索して有効化

### 3. サービスアカウント作成・JSONキーダウンロード

1. 「APIとサービス」→「認証情報」を開く
2. 「認証情報を作成」→「サービスアカウント」を選択
3. 名前を入力して作成（ロールは不要）
4. 作成したサービスアカウントをクリック →「キー」タブ →「鍵を追加」→「JSONをダウンロード」

### 4. スプレッドシート作成・サービスアカウントに編集権限付与

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. URLからスプレッドシートID（`/d/` と `/edit` の間の文字列）をメモ
3. 「共有」からダウンロードしたJSONの `client_email` を追加し、「編集者」権限を付与

### 5. 環境変数の設定

```bash
# JSONファイルの内容を1行にして環境変数に設定
export GOOGLE_CREDENTIALS_JSON=$(cat /path/to/service-account.json)
export GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# Docker Compose を起動
docker compose up
```

エクスポートすると `YYYY-MM-ワークアウト` と `YYYY-MM-ボディ` という名前のシートが自動作成され、今月分のデータが書き込まれます。

---

## 今後の予定

- [x] **Google Sheets 連携** — 記録データを Google スプレッドシートへ自動エクスポート
- [ ] **デプロイ** — Kamal を使用して VPS へデプロイ（バックエンド）/ Vercel（フロントエンド）
- [ ] **グラフ強化** — 種目別のボリューム推移グラフ、1RM推定
- [ ] **トレーニングテンプレート** — よく使うセット構成の保存・呼び出し
- [ ] **PWA 対応** — ホーム画面追加、オフライン対応
