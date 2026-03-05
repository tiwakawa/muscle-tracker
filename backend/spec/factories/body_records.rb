FactoryBot.define do
  factory :body_record do
    association :user
    date { Date.today }
    weight { 70.0 }
    body_fat_percentage { 15.0 }
  end
end
