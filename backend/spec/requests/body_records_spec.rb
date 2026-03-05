require "rails_helper"

RSpec.describe "BodyRecords API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "GET /api/v1/body_records" do
    it "returns 401 without authentication" do
      get "/api/v1/body_records", headers: { "Origin" => "http://localhost:3001" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the current user's body records in descending date order" do
      create(:body_record, user: user, date: "2026-01-01")
      create(:body_record, user: user, date: "2026-03-01")
      create(:body_record) # 別ユーザー

      get "/api/v1/body_records", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(2)
      expect(body.first["date"]).to eq("2026-03-01")
    end
  end

  describe "POST /api/v1/body_records" do
    it "creates a body record with valid params" do
      post "/api/v1/body_records",
        params: { body_record: { date: "2026-03-05", weight: 68.5, body_fat_percentage: 14.2 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["weight"].to_f).to eq(68.5)
      expect(body["body_fat_percentage"].to_f).to eq(14.2)
    end

    it "returns 422 when date is missing" do
      post "/api/v1/body_records",
        params: { body_record: { weight: 68.5 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "returns 422 when weight is 0 or negative" do
      post "/api/v1/body_records",
        params: { body_record: { date: "2026-03-05", weight: -1 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PUT /api/v1/body_records/:id" do
    let(:record) { create(:body_record, user: user, weight: 70.0) }

    it "updates the record" do
      put "/api/v1/body_records/#{record.id}",
        params: { body_record: { weight: 69.0 } }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["weight"].to_f).to eq(69.0)
    end
  end

  describe "DELETE /api/v1/body_records/:id" do
    let!(:record) { create(:body_record, user: user) }

    it "deletes the record" do
      delete "/api/v1/body_records/#{record.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(BodyRecord.find_by(id: record.id)).to be_nil
    end
  end
end
