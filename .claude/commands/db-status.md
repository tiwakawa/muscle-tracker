データベースの状態を確認する。

`docker compose exec backend bundle exec rails runner` で以下を実行:

1. 各モデル（User, Exercise, Workout, WorkoutExercise, WorkoutSet, ExerciseNote, AiAdvice, UserSetting）のレコード数を表示
2. 各テーブルの最新レコードの created_at を表示
3. データが0件のテーブルがあれば警告

結果を見やすい表形式で報告すること。
