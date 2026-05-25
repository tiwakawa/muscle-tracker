class AddSideToWorkoutExercises < ActiveRecord::Migration[8.1]
  def up
    add_column :workout_exercises, :side, :string, default: "", null: false
    add_index :workout_exercises, [:workout_id, :exercise_id, :side], unique: true,
      name: "index_workout_exercises_on_workout_exercise_side"

    # シングルヒップヒンジを削除（参照がないことを確認）
    exercise = Exercise.find_by(name: "シングルヒップヒンジ")
    if exercise
      if WorkoutExercise.where(exercise_id: exercise.id).exists?
        raise "シングルヒップヒンジに紐づくワークアウトデータが存在するため削除できません"
      end
      exercise.destroy!
    end
  end

  def down
    exercise = Exercise.find_by(name: "シングルヒップヒンジ")
    unless exercise
      Exercise.create!(name: "シングルヒップヒンジ", category: "legs")
    end

    remove_index :workout_exercises, name: "index_workout_exercises_on_workout_exercise_side"
    remove_column :workout_exercises, :side
  end
end
