#!/bin/bash
set -euo pipefail
# Keychainから秘密情報を取得してdocker composeを実行する

export GOOGLE_CREDENTIALS_JSON=$(security find-generic-password -a "$USER" -s "muscle-tracker-google-credentials-json" -w)
export GOOGLE_SPREADSHEET_ID=$(security find-generic-password -a "$USER" -s "muscle-tracker-google-spreadsheet-id" -w)
export ANTHROPIC_API_KEY=$(security find-generic-password -a "$USER" -s "muscle-tracker-anthropic-api-key" -w)

docker compose up --force-recreate "$@"
