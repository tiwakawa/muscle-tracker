プロジェクト全体のlintとセキュリティチェックを実行する。

## バックエンド

1. `docker compose exec backend bundle exec rubocop` — コードスタイルチェック
2. `docker compose exec backend bundle exec brakeman --no-pager` — セキュリティ脆弱性チェック
3. `docker compose exec backend bundle exec bundler-audit check --update` — gem脆弱性チェック

## フロントエンド

4. `docker compose exec frontend npx tsc --noEmit` — TypeScript型チェック
5. `docker compose exec frontend npm run lint` — ESLintチェック

問題があれば修正案を提示すること。
