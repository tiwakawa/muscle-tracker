class WorkoutExercise < ApplicationRecord
  belongs_to :workout
  belongs_to :exercise
  has_many :workout_sets, -> { order(:set_number) }, dependent: :destroy

  validates :order, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :side, inclusion: { in: %w[左 右] }, allow_blank: true
  validates :exercise_id, uniqueness: { scope: [:workout_id, :side] }

  accepts_nested_attributes_for :workout_sets, allow_destroy: true
end
