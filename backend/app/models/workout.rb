class Workout < ApplicationRecord
  belongs_to :user
  has_many :workout_exercises, dependent: :destroy
  has_many :workout_sets, through: :workout_exercises

  GYM_TYPES = %w[anytime personal].freeze

  validates :date, presence: true
  validates :condition, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }, allow_nil: true
  validates :gym_type, inclusion: { in: GYM_TYPES }, allow_nil: true
end
