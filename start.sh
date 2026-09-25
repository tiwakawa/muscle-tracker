#!/bin/bash
set -euo pipefail
# Keychainから秘密情報を取得してdocker composeを実行する

export GOOGLE_CREDENTIALS_JSON=$(security find-generic-password -a "$USER" -s "muscle-tracker-google-credentials-json" -w)
export GOOGLE_SPREADSHEET_ID=$(security find-generic-password -a "$USER" -s "muscle-tracker-google-spreadsheet-id" -w)
export ANTHROPIC_API_KEY=$(security find-generic-password -a "$USER" -s "muscle-tracker-anthropic-api-key" -w)

# Notionマスタ連携用（Keychain未登録の場合は空のまま起動し、同期機能のみ利用不可にする）
export NOTION_TOKEN=$(security find-generic-password -a "$USER" -s "muscle-tracker-notion-token" -w 2>/dev/null || echo "")
export NOTION_EXERCISES_DB_ID=$(security find-generic-password -a "$USER" -s "muscle-tracker-notion-exercises-db-id" -w 2>/dev/null || echo "")
export NOTION_WARMUPS_DB_ID=$(security find-generic-password -a "$USER" -s "muscle-tracker-notion-warmups-db-id" -w 2>/dev/null || echo "")

docker compose up --force-recreate "$@"
