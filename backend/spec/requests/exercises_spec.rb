require "rails_helper"

RSpec.describe "Exercises API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }
  let(:exercise) { create(:exercise) }

  describe "GET /api/v1/exercises/:id/weight_history" do
    it "returns 401 without authentication" do
      get "/api/v1/exercises/#{exercise.id}/weight_history"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns empty array when no workout sets exist" do
      get "/api/v1/exercises/#{exercise.id}/weight_history", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to eq([])
    end

    it "returns max weight per date ordered by date" do
      workout1 = create(:workout, user: user, date: "2026-01-01")
      workout2 = create(:workout, user: user, date: "2026-01-08")

      we1 = create(:workout_exercise, workout: workout1, exercise: exercise)
      we2 = create(:workout_exercise, workout: workout2, exercise: exercise)

      create(:workout_set, workout_exercise: we1, weight: 80.0, set_number: 1)
      create(:workout_set, workout_exercise: we1, weight: 85.0, set_number: 2)
      create(:workout_set, workout_exercise: we2, weight: 87.5, set_number: 1)

      get "/api/v1/exercises/#{exercise.id}/weight_history", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(2)
      expect(body[0]["date"]).to eq("2026-01-01")
      expect(body[0]["max_weight"]).to eq(85.0)
      expect(body[1]["date"]).to eq("2026-01-08")
      expect(body[1]["max_weight"]).to eq(87.5)
    end

    it "excludes sets with nil weight" do
      workout = create(:workout, user: user, date: "2026-01-01")
      we = create(:workout_exercise, workout: workout, exercise: exercise)
      create(:workout_set, workout_exercise: we, weight: nil, reps: 10, set_number: 1)

      get "/api/v1/exercises/#{exercise.id}/weight_history", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to eq([])
    end

    it "does not return data from other users" do
      other_workout = create(:workout)
      other_we = create(:workout_exercise, workout: other_workout, exercise: exercise)
      create(:workout_set, workout_exercise: other_we, weight: 100.0, set_number: 1)

      get "/api/v1/exercises/#{exercise.id}/weight_history", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to eq([])
    end
  end
end
