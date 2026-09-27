class WorkoutWarmup < ApplicationRecord
  belongs_to :workout
  belongs_to :warmup

  validates :warmup_id, uniqueness: { scope: :workout_id }
end
