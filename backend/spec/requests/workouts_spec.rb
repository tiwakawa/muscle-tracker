require "rails_helper"

RSpec.describe "Workouts API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/workouts" do
    it "returns 401 without authentication" do
      get "/api/v1/workouts", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the current user's workouts" do
      create_list(:workout, 2, user: user)
      create(:workout) # 別ユーザーのワークアウト（返ってこないはず）

      get "/api/v1/workouts", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(2)
    end
  end

  describe "POST /api/v1/workouts" do
    it "creates a workout with valid params" do
      post "/api/v1/workouts",
        params: { workout: { date: "2026-03-01", condition: 4, memo: "Great" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["date"]).to eq("2026-03-01")
      expect(body["condition"]).to eq(4)
    end

    it "creates a workout with start_time, end_time, and gym_type" do
      post "/api/v1/workouts",
        params: { workout: { date: "2026-03-01", start_time: "09:00", end_time: "10:30", gym_type: "anytime" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["start_time"]).to eq("09:00")
      expect(body["end_time"]).to eq("10:30")
      expect(body["gym_type"]).to eq("anytime")
    end

    it "returns 422 when date is missing" do
      post "/api/v1/workouts",
        params: { workout: { condition: 3 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end
  end

  describe "GET /api/v1/workouts/:id" do
    let(:workout) { create(:workout, user: user) }

    it "returns the workout" do
      get "/api/v1/workouts/#{workout.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(workout.id)
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      get "/api/v1/workouts/#{other_workout.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PUT /api/v1/workouts/:id" do
    let(:workout) { create(:workout, user: user, condition: 2) }

    it "updates the workout" do
      put "/api/v1/workouts/#{workout.id}",
        params: { workout: { condition: 5 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["condition"]).to eq(5)
    end

    it "sets start_time, end_time, gym_type from nil" do
      put "/api/v1/workouts/#{workout.id}",
        params: { workout: { start_time: "09:00", end_time: "10:30", gym_type: "anytime" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["start_time"]).to eq("09:00")
      expect(body["end_time"]).to eq("10:30")
      expect(body["gym_type"]).to eq("anytime")
    end

    it "clears start_time, end_time, gym_type when sent as null" do
      workout.update!(start_time: "09:00", end_time: "10:30", gym_type: "anytime")

      put "/api/v1/workouts/#{workout.id}",
        params: { workout: { start_time: nil, end_time: nil, gym_type: nil } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["start_time"]).to be_nil
      expect(body["end_time"]).to be_nil
      expect(body["gym_type"]).to be_nil
    end
  end

  describe "DELETE /api/v1/workouts/:id" do
    let!(:workout) { create(:workout, user: user) }

    it "deletes the workout" do
      delete "/api/v1/workouts/#{workout.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(Workout.find_by(id: workout.id)).to be_nil
    end
  end
end
