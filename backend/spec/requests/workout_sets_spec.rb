require "rails_helper"

RSpec.describe "WorkoutSets API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }
  let(:workout) { create(:workout, user: user) }
  let(:exercise) { create(:exercise) }
  let(:workout_exercise) { create(:workout_exercise, workout: workout, exercise: exercise, order: 1) }

  describe "POST /api/v1/workouts/:workout_id/workout_exercises/:workout_exercise_id/workout_sets" do
    let(:valid_params) { { workout_set: { set_number: 1, weight: 60.0, reps: 10 } }.to_json }
    let(:path) { "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}/workout_sets" }

    it "returns 401 without authentication" do
      post path, params: valid_params, headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "creates a workout_set with valid params" do
      post path, params: valid_params, headers: headers
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["set_number"]).to eq(1)
      expect(body["reps"]).to eq(10)
    end

    it "returns 422 when set_number is missing" do
      post path,
        params: { workout_set: { weight: 60.0, reps: 10 } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "returns 422 for invalid weight" do
      post path,
        params: { workout_set: { set_number: 1, weight: -5, reps: 10 } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      other_we = create(:workout_exercise, workout: other_workout, exercise: exercise, order: 1)
      post "/api/v1/workouts/#{other_workout.id}/workout_exercises/#{other_we.id}/workout_sets",
        params: valid_params, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PUT /api/v1/workouts/:workout_id/workout_exercises/:workout_exercise_id/workout_sets/:id" do
    let!(:workout_set) { create(:workout_set, workout_exercise: workout_exercise, set_number: 1, weight: 60.0, reps: 10) }
    let(:path) { "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}/workout_sets/#{workout_set.id}" }

    it "returns 401 without authentication" do
      put path, params: { workout_set: { weight: 70.0 } }.to_json, headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "updates the workout_set" do
      put path,
        params: { workout_set: { weight: 70.0, reps: 8 } }.to_json,
        headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["reps"]).to eq(8)
    end

    it "returns 422 for invalid update" do
      put path,
        params: { workout_set: { set_number: 0 } }.to_json,
        headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/workouts/:workout_id/workout_exercises/:workout_exercise_id/workout_sets/:id" do
    let!(:workout_set) { create(:workout_set, workout_exercise: workout_exercise, set_number: 1) }
    let(:path) { "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}/workout_sets/#{workout_set.id}" }

    it "returns 401 without authentication" do
      delete path
      expect(response).to have_http_status(:unauthorized)
    end

    it "deletes the workout_set" do
      delete path, headers: headers
      expect(response).to have_http_status(:no_content)
      expect(WorkoutSet.find_by(id: workout_set.id)).to be_nil
    end
  end
end
