class CreateWorkouts < ActiveRecord::Migration[8.1]
  def change
    create_table :workouts do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.integer :condition
      t.text :memo

      t.timestamps
    end

    add_index :workouts, [:user_id, :date]
  end
end
