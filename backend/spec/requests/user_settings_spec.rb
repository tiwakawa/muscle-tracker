require "rails_helper"

RSpec.describe "User Settings API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/user_setting" do
    it "returns 401 without authentication" do
      get "/api/v1/user_setting", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    context "when no user_setting exists" do
      it "returns nil system_prompt and the default" do
        get "/api/v1/user_setting", headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["system_prompt"]).to be_nil
        expect(body["default_system_prompt"]).to eq(UserSetting::DEFAULT_SYSTEM_PROMPT)
      end
    end

    context "when user_setting exists with custom prompt" do
      before { create(:user_setting, user: user, system_prompt: "カスタムプロンプト") }

      it "returns the custom system_prompt" do
        get "/api/v1/user_setting", headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["system_prompt"]).to eq("カスタムプロンプト")
      end
    end
  end

  describe "PUT /api/v1/user_setting" do
    it "returns 401 without authentication" do
      put "/api/v1/user_setting", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    context "when no user_setting exists" do
      it "creates and returns the setting" do
        put "/api/v1/user_setting", headers: headers,
          params: { user_setting: { system_prompt: "新しいプロンプト" } }.to_json
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["system_prompt"]).to eq("新しいプロンプト")
        expect(UserSetting.find_by(user: user).system_prompt).to eq("新しいプロンプト")
      end
    end

    context "when user_setting already exists" do
      before { create(:user_setting, user: user, system_prompt: "旧プロンプト") }

      it "updates the setting" do
        put "/api/v1/user_setting", headers: headers,
          params: { user_setting: { system_prompt: "更新されたプロンプト" } }.to_json
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["system_prompt"]).to eq("更新されたプロンプト")
      end
    end

    it "can save nil (blank) to reset to default behavior" do
      create(:user_setting, user: user, system_prompt: "既存プロンプト")
      put "/api/v1/user_setting", headers: headers,
        params: { user_setting: { system_prompt: nil } }.to_json
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["system_prompt"]).to be_nil
    end
  end
end
