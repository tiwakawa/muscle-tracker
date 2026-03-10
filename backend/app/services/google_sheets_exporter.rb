class GoogleSheetsExporter
  def initialize(user)
    @user = user
    @spreadsheet_id = ENV.fetch("GOOGLE_SPREADSHEET_ID")
    @service = build_service
  end

  def export_current_month
    now = Date.today
    year_month = now.strftime("%Y-%m")

    workout_sheet_gid = export_workouts(year_month)
    export_body_records(year_month)

    "https://docs.google.com/spreadsheets/d/#{@spreadsheet_id}#gid=#{workout_sheet_gid}"
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

  def export_workouts(year_month)
    sheet_name = "#{year_month}-ワークアウト"
    gid = ensure_sheet(sheet_name)

    start_of_month = Date.parse("#{year_month}-01")
    end_of_month = start_of_month.end_of_month

    workouts = @user.workouts
      .includes(workout_exercises: [:exercise, :workout_sets])
      .where(date: start_of_month..end_of_month)
      .order(:date)

    rows = [["日付", "種目", "セット番号", "重量(kg)", "回数", "コンディション", "メモ"]]
    workouts.each do |workout|
      if workout.workout_exercises.empty?
        rows << [workout.date.to_s, "", "", "", "", CONDITION_LABELS[workout.condition], workout.memo]
      else
        workout.workout_exercises.order(:order).each do |we|
          we.workout_sets.order(:set_number).each do |ws|
            rows << [
              workout.date.to_s,
              we.exercise&.name,
              ws.set_number,
              ws.weight,
              ws.reps,
              CONDITION_LABELS[workout.condition],
              workout.memo
            ]
          end
        end
      end
    end

    write_sheet(sheet_name, rows)
    gid
  end

  def export_body_records(year_month)
    sheet_name = "#{year_month}-ボディ"
    ensure_sheet(sheet_name)

    start_of_month = Date.parse("#{year_month}-01")
    end_of_month = start_of_month.end_of_month

    records = @user.body_records
      .where(date: start_of_month..end_of_month)
      .order(:date)

    rows = [["日付", "体重(kg)", "体脂肪率(%)"]]
    records.each do |r|
      rows << [r.date.to_s, r.weight, r.body_fat_percentage]
    end

    write_sheet(sheet_name, rows)
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
