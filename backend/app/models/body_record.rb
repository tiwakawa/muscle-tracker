class BodyRecord < ApplicationRecord
  belongs_to :user

  validates :date, presence: true
  validates :weight, numericality: { greater_than: 0 }, allow_nil: true
  validates :body_fat_percentage, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
end
