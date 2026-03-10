FactoryBot.define do
  factory :workout_exercise do
    association :workout
    association :exercise
    sequence(:order) { |n| n }
    memo { nil }
  end
end
