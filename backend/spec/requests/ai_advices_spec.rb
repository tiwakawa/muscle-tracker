require "rails_helper"

RSpec.describe "AI Advices API", type: :request do
  let(:user) { create(:user) }
  let(:workout) { create(:workout, user: user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/workouts/:workout_id/ai_advice" do
    it "returns 401 without authentication" do
      get "/api/v1/workouts/#{workout.id}/ai_advice", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      get "/api/v1/workouts/#{other_workout.id}/ai_advice", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    context "when no advice exists" do
      it "returns content: nil" do
        get "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)["content"]).to be_nil
      end
    end

    context "when advice exists" do
      before { create(:ai_advice, workout: workout, content: "既存アドバイス") }

      it "returns the advice" do
        get "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)["content"]).to eq("既存アドバイス")
      end
    end
  end

  describe "POST /api/v1/workouts/:workout_id/ai_advice" do
    before do
      allow_any_instance_of(AiAdviceService).to receive(:generate_advice).and_return("生成されたアドバイス")
    end

    it "uses nil system_prompt (falling back to default) when no user_setting exists" do
      expect(AiAdviceService).to receive(:new).with(anything, system_prompt: nil).and_return(double(generate_advice: "デフォルトアドバイス"))
      post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
      expect(response).to have_http_status(:created)
    end

    context "when user has a custom system_prompt" do
      before { create(:user_setting, user: user, system_prompt: "カスタムプロンプト") }

      it "passes the custom system_prompt to AiAdviceService" do
        expect(AiAdviceService).to receive(:new).with(anything, system_prompt: "カスタムプロンプト").and_return(double(generate_advice: "カスタムアドバイス"))
        post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
        expect(response).to have_http_status(:created)
      end
    end

    it "returns 401 without authentication" do
      post "/api/v1/workouts/#{workout.id}/ai_advice", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 404 for another user's workout" do
      other_workout = create(:workout)
      post "/api/v1/workouts/#{other_workout.id}/ai_advice", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "creates and returns new advice" do
      post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["content"]).to eq("生成されたアドバイス")
      expect(body["created_at"]).to be_present
    end

    it "creates a record when none exists" do
      expect {
        post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
      }.to change(AiAdvice, :count).by(1)
    end

    it "updates the existing record instead of creating a new one" do
      create(:ai_advice, workout: workout, content: "古いアドバイス")
      expect {
        post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
      }.not_to change(AiAdvice, :count)
      expect(AiAdvice.find_by(workout: workout).content).to eq("生成されたアドバイス")
    end

    context "when API call fails" do
      before do
        allow_any_instance_of(AiAdviceService).to receive(:generate_advice).and_raise("API Error")
      end

      it "returns 422" do
        post "/api/v1/workouts/#{workout.id}/ai_advice", headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["errors"]).to include("API Error")
      end
    end
  end
end
