class NotionSyncService
  Report = Struct.new(
    :exercise_notes_upserted, :exercise_notes_deleted, :exercise_notes_skipped,
    :warmups_upserted, :warmups_deleted, :warmups_skipped,
    :errors,
    keyword_init: true
  )

  def initialize(user, client: Notion::Client.new)
    @user = user
    @client = client
    @errors = []
  end

  # トランザクションで囲わない設計。1レコードの不備（tracker_id不一致等）で
  # 同期全体を失敗させず、成功分は反映しつつエラーのみ errors に集める（部分成功を許容）。
  def sync_all
    exercise_note_counts = sync_exercise_notes
    warmup_counts = sync_warmups

    Report.new(**exercise_note_counts, **warmup_counts, errors: @errors)
  end

  private

  def sync_exercise_notes
    exercises_db_id = ENV.fetch("NOTION_EXERCISES_DB_ID")
    pages = @client.query_database(exercises_db_id)

    upserted = 0
    skipped = 0
    synced_exercise_ids = []

    if pages.empty?
      @errors << "種目DBの取得結果が空だったため、種目メモの同期をスキップしました"
      return { exercise_notes_upserted: 0, exercise_notes_deleted: 0, exercise_notes_skipped: 0 }
    end

    pages.each do |page|
      tracker_id = Notion::ExerciseNoteMapper.tracker_id(page)
      if tracker_id.nil?
        skipped += 1
        @errors << "種目ページ #{page['id']} に tracker_id がないためスキップしました"
        next
      end

      exercise = Exercise.find_by(id: tracker_id)
      if exercise.nil?
        skipped += 1
        @errors << "tracker_id=#{tracker_id} に対応する種目がmuscle-tracker側に存在しません"
        next
      end

      # クエリ結果に存在し、既存exerciseとの対応も取れた時点で削除保護の対象にする。
      # 本文取得や保存がこの後失敗しても、既存の正常なexercise_noteを削除対象にしない。
      synced_exercise_ids << exercise.id

      blocks = @client.list_block_children(page["id"])
      body_markdown = Notion::BlockMarkdownConverter.convert(blocks)

      note = @user.exercise_notes.find_or_initialize_by(exercise_id: exercise.id)
      note.note = body_markdown
      if note.save
        upserted += 1
      else
        skipped += 1
        @errors << "exercise_id=#{exercise.id} の保存に失敗: #{note.errors.full_messages.join(', ')}"
      end
    rescue Notion::Client::ApiError => e
      skipped += 1
      @errors << "種目ページ #{page['id']} の本文取得に失敗: #{e.message}"
    end

    deleted = @user.exercise_notes.where.not(exercise_id: synced_exercise_ids).destroy_all.size

    { exercise_notes_upserted: upserted, exercise_notes_deleted: deleted, exercise_notes_skipped: skipped }
  end

  def sync_warmups
    warmups_db_id = ENV.fetch("NOTION_WARMUPS_DB_ID")
    pages = @client.query_database(warmups_db_id)

    upserted = 0
    skipped = 0
    synced_page_ids = []

    if pages.empty?
      @errors << "ウォームアップDBの取得結果が空だったため、ウォームアップの同期をスキップしました"
      return { warmups_upserted: 0, warmups_deleted: 0, warmups_skipped: 0 }
    end

    pages.each do |page|
      # クエリ結果に存在する時点で削除保護の対象にする（page["id"]は常に存在する）。
      # 本文取得や保存がこの後失敗しても、既存の正常なwarmupを削除対象にしない。
      synced_page_ids << page["id"]

      blocks = @client.list_block_children(page["id"])
      body_markdown = Notion::BlockMarkdownConverter.convert(blocks)
      attrs = Notion::WarmupMapper.map(page, body_markdown)

      warmup = Warmup.find_or_initialize_by(notion_page_id: attrs[:notion_page_id])
      warmup.assign_attributes(attrs)
      if warmup.save
        upserted += 1
      else
        skipped += 1
        @errors << "ウォームアップページ #{attrs[:notion_page_id]} の保存に失敗: #{warmup.errors.full_messages.join(', ')}"
      end
    rescue Notion::Client::ApiError => e
      skipped += 1
      @errors << "ウォームアップページ #{page['id']} の本文取得に失敗: #{e.message}"
    end

    deleted = Warmup.where.not(notion_page_id: synced_page_ids).destroy_all.size

    { warmups_upserted: upserted, warmups_deleted: deleted, warmups_skipped: skipped }
  end
end
