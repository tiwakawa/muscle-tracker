FactoryBot.define do
  factory :ai_advice do
    association :workout
    content { "テストアドバイス内容" }
  end
end
