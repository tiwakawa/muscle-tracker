require "rails_helper"

RSpec.describe "Me API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/me" do
    it "returns 401 without authentication" do
      get "/api/v1/me"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the current user" do
      get "/api/v1/me", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("success")
      expect(body["data"]["email"]).to eq(user.email)
    end
  end
end
