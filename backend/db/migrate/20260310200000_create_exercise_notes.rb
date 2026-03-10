class CreateExerciseNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :exercise_notes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :exercise, null: false, foreign_key: true
      t.text :note

      t.timestamps
    end

    add_index :exercise_notes, [:user_id, :exercise_id], unique: true
  end
end
