require "rails_helper"

RSpec.describe "Warmups API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/warmups" do
    it "returns 401 without authentication" do
      get "/api/v1/warmups"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns warmups ordered by no" do
      create(:warmup, no: 2, name: "後")
      create(:warmup, no: 1, name: "先")

      get "/api/v1/warmups", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.map { |w| w["name"] }).to eq([ "先", "後" ])
    end
  end
end
