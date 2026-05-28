FactoryBot.define do
  factory :workout do
    association :user
    date { Date.today }
    condition { 3 }
    memo { "Good session" }

    after(:build) do |workout|
      if workout.workout_exercises.empty?
        workout.workout_exercises.build(
          exercise: FactoryBot.create(:exercise),
          order: 1
        )
      end
    end
  end
end
