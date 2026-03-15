require "rails_helper"

RSpec.describe "Exports API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "POST /api/v1/export" do
    it "returns 401 without authentication" do
      post "/api/v1/export"
      expect(response).to have_http_status(:unauthorized)
    end

    context "when export succeeds" do
      before do
        allow_any_instance_of(GoogleSheetsExporter).to receive(:export_all)
          .and_return("https://docs.google.com/spreadsheets/d/test-id")
      end

      it "returns the spreadsheet URL" do
        post "/api/v1/export", headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["url"]).to include("docs.google.com")
      end
    end

    context "when export fails" do
      before do
        allow_any_instance_of(GoogleSheetsExporter).to receive(:export_all)
          .and_raise("Google Sheets API error")
      end

      it "returns 422 with error message" do
        post "/api/v1/export", headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["error"]).to eq("Google Sheets API error")
      end
    end
  end
end
