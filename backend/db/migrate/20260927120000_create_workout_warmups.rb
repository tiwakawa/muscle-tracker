class CreateWorkoutWarmups < ActiveRecord::Migration[8.1]
  def change
    create_table :workout_warmups do |t|
      t.references :workout, null: false, foreign_key: true
      t.references :warmup, null: false, foreign_key: true

      t.timestamps
    end
    add_index :workout_warmups, [:workout_id, :warmup_id], unique: true
  end
end
