require "rails_helper"

RSpec.describe GoogleSheetsExporter do
  let(:user) { create(:user) }
  let(:exporter) { described_class.new(user) }

  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("GOOGLE_SPREADSHEET_ID").and_return("test-spreadsheet-id")
    allow(ENV).to receive(:fetch).with("GOOGLE_CREDENTIALS_JSON").and_return('{"type":"service_account"}')
    allow(Google::Auth::ServiceAccountCredentials).to receive(:make_creds).and_return(double("credentials"))
    sheets_service = instance_double(Google::Apis::SheetsV4::SheetsService)
    allow(Google::Apis::SheetsV4::SheetsService).to receive(:new).and_return(sheets_service)
    allow(sheets_service).to receive(:authorization=)
  end

  def workout_without_default_exercise(**attrs)
    workout = create(:workout, user: user, **attrs)
    WorkoutExercise.where(workout_id: workout.id).destroy_all
    workout
  end

  describe "#build_ai_rows" do
    it "outputs one row per set for an exercise with sets (regression)" do
      workout = workout_without_default_exercise(date: "2026-03-01")
      exercise = create(:exercise, name: "ベンチプレス")
      we = create(:workout_exercise, workout: workout, exercise: exercise, order: 1)
      create(:workout_set, workout_exercise: we, set_number: 1, weight: 80.0, reps: 10)
      create(:workout_set, workout_exercise: we, set_number: 2, weight: 80.0, reps: 8)

      rows = exporter.send(:build_ai_rows, [ workout ])

      data_rows = rows[1..]
      expect(data_rows.size).to eq(2)
      expect(data_rows[0][6..10]).to eq([ "ベンチプレス", nil, 1, 80.0, 10 ])
      expect(data_rows[1][6..10]).to eq([ "ベンチプレス", nil, 2, 80.0, 8 ])
    end

    it "outputs one blank-set row for an exercise with no sets (EMS/施術)" do
      workout = workout_without_default_exercise(date: "2026-03-01", memo: "施術20分")
      exercise = create(:exercise, name: "EMS", category: "other")
      create(:workout_exercise, workout: workout, exercise: exercise, order: 1, memo: "下半身中心")

      rows = exporter.send(:build_ai_rows, [ workout ])

      data_rows = rows[1..]
      expect(data_rows.size).to eq(1)
      expect(data_rows[0][5]).to eq("施術20分")
      expect(data_rows[0][6..11]).to eq([ "EMS", nil, "", "", "", "下半身中心" ])
    end

    it "outputs both rows when a normal exercise and a set-less exercise are mixed" do
      workout = workout_without_default_exercise(date: "2026-03-01")
      bench = create(:exercise, name: "ベンチプレス")
      ems = create(:exercise, name: "EMS", category: "other")
      we_bench = create(:workout_exercise, workout: workout, exercise: bench, order: 1)
      create(:workout_set, workout_exercise: we_bench, set_number: 1, weight: 80.0, reps: 10)
      create(:workout_exercise, workout: workout, exercise: ems, order: 2)

      rows = exporter.send(:build_ai_rows, [ workout ])

      data_rows = rows[1..]
      expect(data_rows.size).to eq(2)
      expect(data_rows[0][6..10]).to eq([ "ベンチプレス", nil, 1, 80.0, 10 ])
      expect(data_rows[1][6..10]).to eq([ "EMS", nil, "", "", "" ])
    end
  end

  describe "#build_detail_rows" do
    it "outputs one row per set for an exercise with sets (regression)" do
      workout = workout_without_default_exercise(date: "2026-03-01")
      exercise = create(:exercise, name: "ベンチプレス")
      we = create(:workout_exercise, workout: workout, exercise: exercise, order: 1)
      create(:workout_set, workout_exercise: we, set_number: 1, weight: 80.0, reps: 10)

      rows = exporter.send(:build_detail_rows, [ workout ])

      data_rows = rows[1..]
      expect(data_rows.size).to eq(1)
      expect(data_rows[0]).to eq([ "2026-03-01", "ベンチプレス", nil, 1, 80.0, 10, nil ])
    end

    it "outputs one blank-set row for an exercise with no sets (EMS/施術)" do
      workout = workout_without_default_exercise(date: "2026-03-01")
      exercise = create(:exercise, name: "施術", category: "other")
      create(:workout_exercise, workout: workout, exercise: exercise, order: 1, memo: "肩周り")

      rows = exporter.send(:build_detail_rows, [ workout ])

      data_rows = rows[1..]
      expect(data_rows.size).to eq(1)
      expect(data_rows[0]).to eq([ "2026-03-01", "施術", nil, "", "", "", "肩周り" ])
    end
  end
end
