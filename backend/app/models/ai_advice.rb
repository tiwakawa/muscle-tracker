class AiAdvice < ApplicationRecord
  belongs_to :workout
  validates :content, presence: true
  validates :workout_id, uniqueness: true
end
