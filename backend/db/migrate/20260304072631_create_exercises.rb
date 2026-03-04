class CreateExercises < ActiveRecord::Migration[8.1]
  def change
    create_table :exercises do |t|
      t.string :name, null: false
      t.string :category, null: false

      t.datetime :created_at, null: false
    end

    add_index :exercises, :name, unique: true
  end
end
