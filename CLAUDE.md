# muscle-tracker

筋トレ記録管理Webアプリ。Rails 8 API + Next.js 14 + PostgreSQL + Docker構成。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| バックエンド | Ruby 3.3 / Rails 8.1 (API mode) |
| フロントエンド | Next.js 14 (App Router) / TypeScript / Tailwind CSS |
| DB（ローカル） | PostgreSQL 16 (Docker) |
| DB（本番） | Neon (Serverless PostgreSQL) |
| 認証 | devise_token_auth（access-token / client / uid ヘッダー） |
| 外部API | Claude API (AIアドバイス) / Google Sheets API (エクスポート) |
| ホスティング | Vercel (frontend) / Render.com (backend) |

## ディレクトリ構成

```
muscle-tracker/
├── backend/           # Rails API
├── frontend/          # Next.js
├── .claude/           # Claude Code設定・カスタムコマンド
├── .devcontainer/     # Dev Container設定（参考用）
└── docker-compose.yml
```

## よく使うコマンド

すべてのコマンドは `docker compose exec` 経由で実行する。

### バックエンド

```bash
docker compose exec backend bundle exec rspec                           # テスト実行
docker compose exec backend bundle exec rails db:migrate                # マイグレーション
docker compose exec backend bundle exec rails db:seed                   # シードデータ投入
docker compose exec backend bundle exec rubocop                         # コードスタイルチェック
docker compose exec backend bundle exec brakeman --no-pager             # セキュリティチェック
docker compose exec backend bundle exec bundler-audit check --update    # gem脆弱性チェック
```

### フロントエンド

```bash
docker compose exec frontend npm run lint          # ESLintチェック
docker compose exec frontend npx tsc --noEmit      # 型チェック
docker compose exec frontend npm run build         # 本番ビルド
```

### Docker Compose

```bash
./start.sh -d                   # 全サービスをバックグラウンド起動（Keychain経由）
docker compose logs -f backend  # バックエンドのログを追跡
docker compose logs -f frontend # フロントエンドのログを追跡
docker compose ps               # サービスの状態確認
```

### ローカルアクセス

- フロントエンド: http://localhost:3001
- バックエンドAPI: http://localhost:3000

## 環境変数

- **秘密情報**: macOS Keychainに登録、`start.sh`経由で取得
  - `muscle-tracker-google-credentials-json` → GOOGLE_CREDENTIALS_JSON
  - `muscle-tracker-google-spreadsheet-id` → GOOGLE_SPREADSHEET_ID
  - `muscle-tracker-anthropic-api-key` → ANTHROPIC_API_KEY
- **DB接続**: docker-compose.ymlにハードコード（ローカル開発用）
- 本番（Render/Vercel）の環境変数は各ダッシュボードで管理

## アーキテクチャの注意事項

- APIルートは `/api/v1/` プレフィックスで統一
- 認証はdevise_token_authのトークン方式（JWTではない）
- フロントエンドはLocalStorageでトークンを保持し `lib/api.ts` 経由で付与
- Serviceクラスにビジネスロジックを分離（`app/services/`）

## コード規約

- **Ruby**: RuboCop Omakase プリセット（`backend/.rubocop.yml`）
- **TypeScript**: ESLint (Next.js デフォルト) + Prettier
- **テスト**: RSpec + Factory Bot + Shoulda Matchers
- フォーマットはVSCode保存時に自動適用（Ruby LSP / Prettier）

## テスト方針

- **バックエンド**: RSpec + Factory Bot + Shoulda Matchers
  - モデルスペック: `backend/spec/models/`
  - リクエストスペック: `backend/spec/requests/`
  - サービススペック: `backend/spec/services/`
  - ファクトリ: `backend/spec/factories/`
  - カバレッジ: SimpleCov（lcov形式でCodecovに送信）
- **フロントエンド**: CIでの型チェック（tsc）+ ESLintのみ
- 新しいモデル・エンドポイント追加時は、対応するスペックも作成する
- テスト実行: `docker compose exec backend bundle exec rspec`
- 特定ファイルのみ: `docker compose exec backend bundle exec rspec spec/requests/exercises_spec.rb`

## CI/CD

- `main` ブランチへのpushで自動デプロイ（Vercel / Render.com）
- GitHub Actions: RSpec（backend）/ tsc + lint（frontend）が自動実行
- PRマージ前にCIが通っていることを確認する

## Claude Code カスタムコマンド

- `/lint` — バックエンド全体のlint・セキュリティチェック + フロントエンドの型チェック・lint
- `/test` — バックエンドのRSpecテスト実行（引数でファイル指定可能）
- `/db-status` — データベースの各テーブルの状態確認
- `/type-check` — フロントエンドの型チェック実行
