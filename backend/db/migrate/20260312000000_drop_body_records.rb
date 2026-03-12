class DropBodyRecords < ActiveRecord::Migration[8.1]
  def up
    drop_table :body_records
  end

  def down
    create_table :body_records do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.decimal :weight, precision: 5, scale: 2
      t.decimal :body_fat_percentage, precision: 5, scale: 2
      t.timestamps
    end
  end
end
