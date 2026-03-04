class CreateBodyRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :body_records do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.decimal :weight, precision: 5, scale: 2
      t.decimal :body_fat_percentage, precision: 5, scale: 2

      t.timestamps
    end

    add_index :body_records, [:user_id, :date]
  end
end
