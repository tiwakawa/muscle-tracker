class Workout < ApplicationRecord
  belongs_to :user
  has_many :workout_exercises, -> { order(:order) }, dependent: :destroy
  has_many :workout_sets, through: :workout_exercises
  has_many :ai_advices, dependent: :destroy

  accepts_nested_attributes_for :workout_exercises, allow_destroy: true

  GYM_TYPES = %w[anytime personal home municipal].freeze

  validates :date, presence: true
  validates :condition, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }, allow_nil: true
  validates :gym_type, inclusion: { in: GYM_TYPES }, allow_nil: true
  validate :must_have_at_least_one_exercise

  private

  def must_have_at_least_one_exercise
    # reject exercises marked for destruction
    remaining = workout_exercises.reject(&:marked_for_destruction?)
    if remaining.empty?
      errors.add(:base, "種目を1つ以上追加してください")
    end
  end
end
