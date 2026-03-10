class MigrateWorkoutSetsToWorkoutExercises < ActiveRecord::Migration[8.1]
  def up
    # Step 1: Add workout_exercise_id as nullable first
    add_reference :workout_sets, :workout_exercise, null: true, foreign_key: true

    # Step 2: Create workout_exercise records from existing workout_sets data.
    # Assigns `order` based on the first appearance of each exercise in a workout.
    execute <<~SQL
      INSERT INTO workout_exercises (workout_id, exercise_id, "order", created_at, updated_at)
      SELECT workout_id, exercise_id,
        ROW_NUMBER() OVER (PARTITION BY workout_id ORDER BY min_id) AS "order",
        NOW(), NOW()
      FROM (
        SELECT workout_id, exercise_id, MIN(id) AS min_id
        FROM workout_sets
        GROUP BY workout_id, exercise_id
      ) AS sub
    SQL

    # Step 3: Link each workout_set to its workout_exercise (PostgreSQL UPDATE...FROM syntax)
    execute <<~SQL
      UPDATE workout_sets ws
      SET workout_exercise_id = we.id
      FROM workout_exercises we
      WHERE we.workout_id = ws.workout_id AND we.exercise_id = ws.exercise_id
    SQL

    # Step 4: Make workout_exercise_id non-null
    change_column_null :workout_sets, :workout_exercise_id, false

    # Step 5: Remove exercise_id
    remove_reference :workout_sets, :exercise, foreign_key: true
  end

  def down
    add_reference :workout_sets, :exercise, null: true, foreign_key: true

    execute <<~SQL
      UPDATE workout_sets ws
      SET exercise_id = we.exercise_id
      FROM workout_exercises we
      WHERE we.id = ws.workout_exercise_id
    SQL

    change_column_null :workout_sets, :exercise_id, false
    remove_reference :workout_sets, :workout_exercise, foreign_key: true
  end
end
