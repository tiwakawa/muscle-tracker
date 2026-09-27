class Warmup < ApplicationRecord
  has_many :workout_warmups, dependent: :destroy
  has_many :workouts, through: :workout_warmups

  validates :notion_page_id, presence: true, uniqueness: true
  validates :name, presence: true
  validates :no, presence: true
end
