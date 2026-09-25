FactoryBot.define do
  factory :warmup do
    sequence(:notion_page_id) { |n| "notion-page-#{n}" }
    sequence(:no) { |n| n }
    name { "肩甲骨はがし" }
    category { [ "肩" ] }
    timing { "トレ前" }
    priority { "推奨" }
    items { [] }
    status { "実行中" }
    body_markdown { "## やり方\n手順です" }
  end
end
