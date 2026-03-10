FactoryBot.define do
  factory :workout_set do
    association :workout_exercise
    sequence(:set_number) { |n| n }
    weight { 60.0 }
    reps { 10 }
  end
end
