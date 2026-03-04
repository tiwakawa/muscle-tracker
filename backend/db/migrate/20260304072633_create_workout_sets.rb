class CreateWorkoutSets < ActiveRecord::Migration[8.1]
  def change
    create_table :workout_sets do |t|
      t.references :workout, null: false, foreign_key: true
      t.references :exercise, null: false, foreign_key: true
      t.integer :set_number, null: false
      t.decimal :weight, precision: 5, scale: 2
      t.integer :reps

      t.datetime :created_at, null: false
    end
  end
end
