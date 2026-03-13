FactoryBot.define do
  factory :user_setting do
    association :user
    system_prompt { nil }
  end
end
