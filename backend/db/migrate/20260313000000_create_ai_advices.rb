class CreateAiAdvices < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_advices do |t|
      t.references :workout, null: false, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end
  end
end
