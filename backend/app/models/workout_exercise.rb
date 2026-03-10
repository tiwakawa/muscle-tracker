class WorkoutExercise < ApplicationRecord
  belongs_to :workout
  belongs_to :exercise
  has_many :workout_sets, dependent: :destroy

  validates :order, presence: true, numericality: { only_integer: true, greater_than: 0 }
end
