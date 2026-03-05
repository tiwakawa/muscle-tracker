FactoryBot.define do
  factory :workout do
    association :user
    date { Date.today }
    condition { 3 }
    memo { "Good session" }
  end
end
