class CreateWarmups < ActiveRecord::Migration[8.1]
  def change
    create_table :warmups do |t|
      t.string :notion_page_id, null: false
      t.integer :no, null: false
      t.string :name, null: false
      t.string :category, array: true, default: [], null: false
      t.string :timing
      t.string :priority
      t.string :items, array: true, default: [], null: false
      t.string :status
      t.text :body_markdown

      t.timestamps
    end

    add_index :warmups, :notion_page_id, unique: true
  end
end
