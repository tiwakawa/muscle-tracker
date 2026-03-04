class Exercise < ApplicationRecord
  has_many :workout_sets, dependent: :destroy

  CATEGORIES = %w[chest back shoulders arms legs core cardio other].freeze

  validates :name, presence: true, uniqueness: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }
end
