バックエンドのRSpecテストを実行する。

引数が指定された場合: `docker compose exec backend bundle exec rspec $ARGUMENTS`
引数なしの場合: `docker compose exec backend bundle exec rspec`

テスト失敗時は失敗したテストの内容を分析し、修正案を提示すること。
