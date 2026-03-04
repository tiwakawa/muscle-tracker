class WorkoutSet < ApplicationRecord
  belongs_to :workout
  belongs_to :exercise

  validates :set_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :weight, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :reps, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
end
