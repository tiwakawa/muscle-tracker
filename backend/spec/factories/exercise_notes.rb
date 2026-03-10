FactoryBot.define do
  factory :exercise_note do
    association :user
    association :exercise
    note { "Some note" }
  end
end
