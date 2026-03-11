class GoogleSheetsExporter
  SHEET_NAMES = {
    ai: "AI用",
    summary: "サマリー",
    detail: "詳細",
    exercise_notes: "種目メモ"
  }.freeze

  def initialize(user)
    @user = user
    @spreadsheet_id = ENV.fetch("GOOGLE_SPREADSHEET_ID")
    @service = build_service
  end

  def export_current_month
    workouts = @user.workouts
      .includes(workout_exercises: [:exercise, :workout_sets])
      .order(:date)

    exercise_notes = @user.exercise_notes.includes(:exercise)
    notes_by_exercise = exercise_notes.each_with_object({}) { |en, h| h[en.exercise_id] = en.note }

    SHEET_NAMES.each_value { |name| ensure_sheet(name) }

    write_sheet(SHEET_NAMES[:ai], build_ai_rows(workouts, notes_by_exercise))
    write_sheet(SHEET_NAMES[:summary], build_summary_rows(workouts))
    write_sheet(SHEET_NAMES[:detail], build_detail_rows(workouts, notes_by_exercise))
    write_sheet(SHEET_NAMES[:exercise_notes], build_exercise_notes_rows(exercise_notes))

    "https://docs.google.com/spreadsheets/d/#{@spreadsheet_id}"
  end

  private

  def build_service
    credentials_json = ENV.fetch("GOOGLE_CREDENTIALS_JSON")
    credentials = Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: StringIO.new(credentials_json),
      scope: Google::Apis::SheetsV4::AUTH_SPREADSHEETS
    )
    service = Google::Apis::SheetsV4::SheetsService.new
    service.authorization = credentials
    service
  end

  CONDITION_LABELS = { 1 => "最悪", 2 => "悪い", 3 => "普通", 4 => "良い", 5 => "最高" }.freeze
  GYM_TYPE_LABELS = { "anytime" => "エニタイム", "personal" => "パーソナル" }.freeze

  def format_time(t)
    t&.strftime("%H:%M")
  end

  def format_condition(c)
    CONDITION_LABELS[c]
  end

  def format_gym_type(g)
    GYM_TYPE_LABELS[g]
  end

  def build_ai_rows(workouts, notes_by_exercise)
    rows = [["日付", "開始時間", "終了時間", "ジムタイプ", "コンディション", "全体メモ", "種目", "セット番号", "重量(kg)", "回数", "種目メモ"]]
    workouts.each do |workout|
      base = [
        workout.date.to_s,
        format_time(workout.start_time),
        format_time(workout.end_time),
        format_gym_type(workout.gym_type),
        format_condition(workout.condition),
        workout.memo
      ]
      if workout.workout_exercises.empty?
        rows << base + ["", "", "", "", ""]
      else
        workout.workout_exercises.order(:order).each do |we|
          we.workout_sets.order(:set_number).each do |ws|
            rows << base + [we.exercise&.name, ws.set_number, ws.weight, ws.reps, notes_by_exercise[we.exercise_id]]
          end
        end
      end
    end
    rows
  end

  def build_summary_rows(workouts)
    rows = [["日付", "開始時間", "終了時間", "ジムタイプ", "コンディション", "全体メモ"]]
    workouts.each do |workout|
      rows << [
        workout.date.to_s,
        format_time(workout.start_time),
        format_time(workout.end_time),
        format_gym_type(workout.gym_type),
        format_condition(workout.condition),
        workout.memo
      ]
    end
    rows
  end

  def build_detail_rows(workouts, notes_by_exercise)
    rows = [["日付", "種目", "セット番号", "重量(kg)", "回数", "種目メモ"]]
    workouts.each do |workout|
      workout.workout_exercises.order(:order).each do |we|
        we.workout_sets.order(:set_number).each do |ws|
          rows << [
            workout.date.to_s,
            we.exercise&.name,
            ws.set_number,
            ws.weight,
            ws.reps,
            notes_by_exercise[we.exercise_id]
          ]
        end
      end
    end
    rows
  end

  def build_exercise_notes_rows(exercise_notes)
    rows = [["種目名", "メモ"]]
    exercise_notes.sort_by { |en| en.exercise&.name.to_s }.each do |en|
      rows << [en.exercise&.name, en.note]
    end
    rows
  end

  def ensure_sheet(sheet_name)
    spreadsheet = @service.get_spreadsheet(@spreadsheet_id)
    existing_sheet = spreadsheet.sheets.find { |s| s.properties.title == sheet_name }

    if existing_sheet
      @service.clear_values(@spreadsheet_id, "#{sheet_name}!A:Z")
      existing_sheet.properties.sheet_id
    else
      request = Google::Apis::SheetsV4::BatchUpdateSpreadsheetRequest.new(
        requests: [
          {
            add_sheet: {
              properties: { title: sheet_name }
            }
          }
        ]
      )
      response = @service.batch_update_spreadsheet(@spreadsheet_id, request)
      response.replies.first.add_sheet.properties.sheet_id
    end
  end

  def write_sheet(sheet_name, rows)
    value_range = Google::Apis::SheetsV4::ValueRange.new(values: rows)
    @service.update_spreadsheet_value(
      @spreadsheet_id,
      "#{sheet_name}!A1",
      value_range,
      value_input_option: "USER_ENTERED"
    )
  end
end
