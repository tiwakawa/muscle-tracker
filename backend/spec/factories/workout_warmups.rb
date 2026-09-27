FactoryBot.define do
  factory :workout_warmup do
    association :workout
    association :warmup
  end
end
