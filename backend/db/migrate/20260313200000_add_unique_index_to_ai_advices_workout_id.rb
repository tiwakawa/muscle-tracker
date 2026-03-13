class AddUniqueIndexToAiAdvicesWorkoutId < ActiveRecord::Migration[8.1]
  def change
    # Remove duplicate records, keeping only the most recent per workout
    execute <<~SQL
      DELETE FROM ai_advices
      WHERE id NOT IN (
        SELECT MAX(id) FROM ai_advices GROUP BY workout_id
      )
    SQL

    remove_index :ai_advices, :workout_id
    add_index :ai_advices, :workout_id, unique: true
  end
end
