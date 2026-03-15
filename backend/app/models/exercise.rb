class Exercise < ApplicationRecord
  has_many :workout_exercises, dependent: :destroy
  has_many :workout_sets, through: :workout_exercises
  has_many :exercise_notes, dependent: :destroy

  CATEGORIES = %w[chest back shoulders arms legs core cardio other].freeze

  validates :name, presence: true, uniqueness: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }
end
