class AiAdvice < ApplicationRecord
  belongs_to :workout
  validates :content, presence: true
end
