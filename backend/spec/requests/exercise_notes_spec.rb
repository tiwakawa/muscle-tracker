require "rails_helper"

RSpec.describe "ExerciseNotes API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }
  let(:exercise) { create(:exercise) }

  describe "GET /api/v1/exercise_notes/:exercise_id" do
    it "returns 401 without authentication" do
      get "/api/v1/exercise_notes/#{exercise.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns nil note when none exists" do
      get "/api/v1/exercise_notes/#{exercise.id}", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["note"]).to be_nil
      expect(body["exercise_id"]).to eq(exercise.id)
    end

    it "returns the existing note" do
      create(:exercise_note, user: user, exercise: exercise, note: "My note")

      get "/api/v1/exercise_notes/#{exercise.id}", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["note"]).to eq("My note")
    end

    it "does not return another user's note" do
      other_note = create(:exercise_note, exercise: exercise, note: "Other note")

      get "/api/v1/exercise_notes/#{exercise.id}", headers: headers

      body = JSON.parse(response.body)
      expect(body["note"]).not_to eq(other_note.note)
    end
  end

  describe "PUT /api/v1/exercise_notes/:exercise_id" do
    it "creates a note when none exists" do
      put "/api/v1/exercise_notes/#{exercise.id}",
        params: { exercise_note: { note: "New note" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["note"]).to eq("New note")
    end

    it "updates an existing note" do
      create(:exercise_note, user: user, exercise: exercise, note: "Old note")

      put "/api/v1/exercise_notes/#{exercise.id}",
        params: { exercise_note: { note: "Updated note" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["note"]).to eq("Updated note")
    end

    it "clears a note when saved as empty string" do
      create(:exercise_note, user: user, exercise: exercise, note: "Existing note")

      put "/api/v1/exercise_notes/#{exercise.id}",
        params: { exercise_note: { note: "" } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["note"]).to eq("")
    end
  end
end
