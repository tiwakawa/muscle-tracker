require "rails_helper"

RSpec.describe "Authentication", type: :request do
  let(:headers) { { "Content-Type" => "application/json", "Origin" => "http://localhost:3001" } }

  describe "POST /auth (sign up)" do
    it "creates a user and returns auth tokens" do
      post "/auth",
        params: { email: "new@example.com", password: "password123", password_confirmation: "password123" }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["email"]).to eq("new@example.com")
      expect(response.headers["access-token"]).to be_present
    end

    it "returns errors for duplicate email" do
      create(:user, email: "dup@example.com")

      post "/auth",
        params: { email: "dup@example.com", password: "password123", password_confirmation: "password123" }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /auth/sign_in" do
    let!(:user) { create(:user, email: "login@example.com", password: "password123") }

    it "returns auth tokens on success" do
      post "/auth/sign_in",
        params: { email: "login@example.com", password: "password123" }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.headers["access-token"]).to be_present
      expect(response.headers["uid"]).to eq("login@example.com")
    end

    it "returns 401 for invalid credentials" do
      post "/auth/sign_in",
        params: { email: "login@example.com", password: "wrongpassword" }.to_json,
        headers: headers

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
