module Notion
  class ExerciseNoteMapper
    # 本文取得（Blocks API呼び出し）より前に、ページ単体のプロパティだけでtracker_idを判定するために使う。
    def self.tracker_id(page)
      page.dig("properties", "tracker_id", "number")&.to_i
    end
  end
end
