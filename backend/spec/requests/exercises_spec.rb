require "rails_helper"

RSpec.describe "Exercises API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }
  let(:exercise) { create(:exercise) }

  describe "GET /api/v1/exercises" do
    it "returns 401 without authentication" do
      get "/api/v1/exercises"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns a list of exercises" do
      create(:exercise, name: "ベンチプレス", category: "chest")
      get "/api/v1/exercises", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to be_an(Array)
      expect(body.map { |e| e["name"] }).to include("ベンチプレス")
    end
  end

  describe "GET /api/v1/exercises/:id" do
    it "returns 401 without authentication" do
      get "/api/v1/exercises/#{exercise.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the exercise" do
      get "/api/v1/exercises/#{exercise.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["id"]).to eq(exercise.id)
      expect(body["name"]).to eq(exercise.name)
    end

    it "returns 404 for non-existent id" do
      get "/api/v1/exercises/0", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/exercises" do
    it "returns 401 without authentication" do
      post "/api/v1/exercises",
        params: { exercise: { name: "スクワット", category: "legs" } }.to_json,
        headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "creates an exercise with valid params" do
      post "/api/v1/exercises",
        params: { exercise: { name: "スクワット", category: "legs" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["name"]).to eq("スクワット")
      expect(body["category"]).to eq("legs")
    end

    it "returns 422 when name is missing" do
      post "/api/v1/exercises",
        params: { exercise: { category: "legs" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "returns 422 when name is duplicate" do
      create(:exercise, name: "重複種目")
      post "/api/v1/exercises",
        params: { exercise: { name: "重複種目", category: "chest" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "returns 422 when category is invalid" do
      post "/api/v1/exercises",
        params: { exercise: { name: "新種目", category: "invalid" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PUT /api/v1/exercises/:id" do
    it "returns 401 without authentication" do
      put "/api/v1/exercises/#{exercise.id}",
        params: { exercise: { name: "更新" } }.to_json,
        headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "updates the exercise" do
      put "/api/v1/exercises/#{exercise.id}",
        params: { exercise: { name: "更新後の種目名" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["name"]).to eq("更新後の種目名")
    end

    it "returns 422 when updating with invalid category" do
      put "/api/v1/exercises/#{exercise.id}",
        params: { exercise: { category: "invalid" } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/exercises/:id" do
    it "returns 401 without authentication" do
      delete "/api/v1/exercises/#{exercise.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "deletes the exercise" do
      delete "/api/v1/exercises/#{exercise.id}", headers: headers
      expect(response).to have_http_status(:no_content)
      expect(Exercise.find_by(id: exercise.id)).to be_nil
    end
  end

  describe "GET /api/v1/exercises/:id/last_sets" do
    it "returns 401 without authentication" do
      get "/api/v1/exercises/#{exercise.id}/last_sets"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns empty when no sets exist" do
      get "/api/v1/exercises/#{exercise.id}/last_sets", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq([])
    end

    it "returns the most recent sets for this user" do
      workout = create(:workout, user: user, date: Date.today)
      we = create(:workout_exercise, workout: workout, exercise: exercise, order: 1)
      create(:workout_set, workout_exercise: we, weight: 70.0, reps: 8, set_number: 1)

      get "/api/v1/exercises/#{exercise.id}/last_sets", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(1)
      expect(body[0]["weight"].to_f).to eq(70.0)
      expect(body[0]["reps"]).to eq(8)
    end

    it "does not return other users' sets" do
      other_workout = create(:workout)
      other_we = create(:workout_exercise, workout: other_workout, exercise: exercise, order: 1)
      create(:workout_set, workout_exercise: other_we, weight: 100.0, reps: 5, set_number: 1)

      get "/api/v1/exercises/#{exercise.id}/last_sets", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq([])
    end
  end

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
