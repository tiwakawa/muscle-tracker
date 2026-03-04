class Workout < ApplicationRecord
  belongs_to :user
  has_many :workout_sets, dependent: :destroy

  validates :date, presence: true
  validates :condition, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }, allow_nil: true
end
