require "rails_helper"

RSpec.describe "WorkoutExercises API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }
  let(:workout) { create(:workout, user: user) }
  let(:exercise) { create(:exercise) }

  describe "POST /api/v1/workouts/:workout_id/workout_exercises" do
    it "creates a workout_exercise with valid params" do
      post "/api/v1/workouts/#{workout.id}/workout_exercises",
        params: { workout_exercise: { exercise_id: exercise.id, order: 1, memo: "Good" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["exercise_id"]).to eq(exercise.id)
      expect(body["order"]).to eq(1)
      expect(body["memo"]).to eq("Good")
    end

    it "returns 422 when order is missing" do
      post "/api/v1/workouts/#{workout.id}/workout_exercises",
        params: { workout_exercise: { exercise_id: exercise.id } }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      post "/api/v1/workouts/#{other_workout.id}/workout_exercises",
        params: { workout_exercise: { exercise_id: exercise.id, order: 1 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PUT /api/v1/workouts/:workout_id/workout_exercises/:id" do
    let(:workout_exercise) { create(:workout_exercise, workout: workout, exercise: exercise, order: 1) }

    it "returns 401 without authentication" do
      put "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}",
        params: { workout_exercise: { order: 2 } }.to_json,
        headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "updates the workout_exercise" do
      put "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}",
        params: { workout_exercise: { memo: "Updated memo", order: 2 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["memo"]).to eq("Updated memo")
      expect(body["order"]).to eq(2)
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      other_we = create(:workout_exercise, workout: other_workout, exercise: exercise, order: 1)
      put "/api/v1/workouts/#{other_workout.id}/workout_exercises/#{other_we.id}",
        params: { workout_exercise: { order: 2 } }.to_json,
        headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/workouts/:workout_id/workout_exercises/:id" do
    let!(:workout_exercise) { create(:workout_exercise, workout: workout, exercise: exercise, order: 1) }

    it "returns 401 without authentication" do
      delete "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "deletes the workout_exercise" do
      delete "/api/v1/workouts/#{workout.id}/workout_exercises/#{workout_exercise.id}",
        headers: headers

      expect(response).to have_http_status(:no_content)
      expect(WorkoutExercise.find_by(id: workout_exercise.id)).to be_nil
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      other_we = create(:workout_exercise, workout: other_workout, exercise: exercise, order: 1)
      delete "/api/v1/workouts/#{other_workout.id}/workout_exercises/#{other_we.id}",
        headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
