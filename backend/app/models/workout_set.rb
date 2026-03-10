class WorkoutSet < ApplicationRecord
  belongs_to :workout_exercise

  before_validation :set_workout_id

  validates :set_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :weight, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :reps, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  private

  def set_workout_id
    self.workout_id = workout_exercise&.workout_id
  end
end
