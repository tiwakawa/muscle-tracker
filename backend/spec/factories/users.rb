FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    # devise_token_auth は email プロバイダー時に uid = email を要求する
    uid { email }
    provider { "email" }
  end
end
