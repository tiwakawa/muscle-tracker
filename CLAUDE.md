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
├── backend/        # Rails API
├── frontend/       # Next.js
├── .devcontainer/  # Dev Container設定
└── docker-compose.yml
```

## よく使うコマンド

### バックエンド（DevContainer内 `/workspace/backend`）

```bash
bundle exec rails s -p 3000 -b '0.0.0.0'  # サーバー起動
bundle exec rspec                           # テスト実行
bundle exec rails db:migrate                # マイグレーション
bundle exec rails db:seed                   # シードデータ投入
```

### フロントエンド（DevContainer内 `/workspace/frontend`）

```bash
npm run dev          # 開発サーバー起動（port 3001）
npm run lint         # ESLintチェック
npx tsc --noEmit     # 型チェック
npm run build        # 本番ビルド
```

### ローカルアクセス

- フロントエンド: http://localhost:3001
- バックエンドAPI: http://localhost:3000

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

## CI/CD

- `main` ブランチへのpushで自動デプロイ（Vercel / Render.com）
- GitHub Actions: RSpec（backend）/ tsc + lint（frontend）が自動実行
- PRマージ前にCIが通っていることを確認する

## 秘密情報の扱い

- このプロジェクトでは、秘密情報を含む可能性があるファイルを読まない・表示しない・要約しないこと。
- 必要な場合でも秘密の値は扱わず、環境変数名のみを前提に進めること。
