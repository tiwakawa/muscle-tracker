exercises = [
  { name: "ベンチプレス", category: "chest" },
  { name: "インクラインベンチプレス", category: "chest" },
  { name: "ダンベルフライ", category: "chest" },
  { name: "デッドリフト", category: "back" },
  { name: "懸垂", category: "back" },
  { name: "ラットプルダウン", category: "back" },
  { name: "バーベルロウ", category: "back" },
  { name: "ショルダープレス", category: "shoulders" },
  { name: "サイドレイズ", category: "shoulders" },
  { name: "バーベルカール", category: "arms" },
  { name: "トライセプスプレスダウン", category: "arms" },
  { name: "スクワット", category: "legs" },
  { name: "レッグプレス", category: "legs" },
  { name: "ランジ", category: "legs" },
  { name: "プランク", category: "core" },
  { name: "クランチ", category: "core" },
  { name: "ランニング", category: "cardio" },
  { name: "レッグカール", category: "legs" },
  { name: "レッグエクステンション", category: "legs" },
  { name: "シーテッドローイング", category: "back" },
  { name: "チェストプレス", category: "chest" },
  { name: "ヒップアブダクション", category: "legs" },
  { name: "ヒップアダクション", category: "legs" },
]

exercises.each do |attrs|
  Exercise.find_or_create_by!(name: attrs[:name]) do |e|
    e.category = attrs[:category]
  end
end

puts "Seeded #{Exercise.count} exercises"
