class NotionMirrorService
  RICH_TEXT_CHUNK_SIZE = 2000

  def initialize(user:, client: Notion::Client.new(api_key: ENV.fetch("NOTION_AI_MIRROR_TOKEN")))
    @user = user
    @client = client
  end

  def mirror_all
    mirror_warmups + mirror_exercises
  end

  private

  def mirror_warmups
    Notion::MirrorUpserter.call(
      client: @client,
      database_id: ENV.fetch("NOTION_AI_MIRROR_WARMUPS_DB_ID"),
      records: Warmup.all,
      source_key: ->(warmup) { warmup.notion_page_id }
    ) { |warmup, key| warmup_properties(warmup, key) }
  end

  def mirror_exercises
    notes = @user.exercise_notes.includes(:exercise)

    Notion::MirrorUpserter.call(
      client: @client,
      database_id: ENV.fetch("NOTION_AI_MIRROR_EXERCISES_DB_ID"),
      records: notes,
      source_key: ->(note) { "exercise-#{note.exercise_id}" }
    ) { |note, key| exercise_properties(note.exercise, note, key) }
  end

  def warmup_properties(warmup, key)
    {
      "名前" => title_property(warmup.name),
      "部位・目的" => multi_select_property(warmup.category),
      "タイミング" => select_property(warmup.timing),
      "優先度" => select_property(warmup.priority),
      "使用アイテム" => rich_text_property(warmup.items.join("、")),
      "本文" => rich_text_property(warmup.body_markdown.to_s),
      "状態" => select_property(warmup.status),
      "ソースID" => rich_text_property(key)
    }
  end

  def exercise_properties(exercise, note, key)
    {
      "名前" => title_property(exercise.name),
      "カテゴリ" => select_property(exercise.category),
      "メモ" => rich_text_property(note.note.to_s),
      "ソースID" => rich_text_property(key)
    }
  end

  def title_property(text)
    { title: [ { text: { content: text.to_s } } ] }
  end

  def select_property(value)
    { select: value.present? ? { name: value } : nil }
  end

  def multi_select_property(values)
    { multi_select: Array(values).map { |v| { name: v } } }
  end

  def rich_text_property(text)
    { rich_text: chunk_for_notion(text).map { |chunk| { text: { content: chunk } } } }
  end

  def chunk_for_notion(text, size = RICH_TEXT_CHUNK_SIZE)
    text.to_s.chars.each_slice(size).map(&:join)
  end
end
