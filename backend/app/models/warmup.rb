class Warmup < ApplicationRecord
  validates :notion_page_id, presence: true, uniqueness: true
  validates :name, presence: true
  validates :no, presence: true
end
