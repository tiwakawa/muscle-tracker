require "rails_helper"

RSpec.describe "NotionSync API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user).merge(json_headers) }

  describe "POST /api/v1/notion_sync" do
    it "returns 401 without authentication" do
      post "/api/v1/notion_sync"
      expect(response).to have_http_status(:unauthorized)
    end

    context "when sync succeeds" do
      before do
        report = NotionSyncService::Report.new(
          exercise_notes_upserted: 6, exercise_notes_deleted: 1, exercise_notes_skipped: 0,
          warmups_upserted: 17, warmups_deleted: 0, warmups_skipped: 0, errors: []
        )
        service = instance_double(NotionSyncService, sync_all: report)
        allow(NotionSyncService).to receive(:new).and_return(service)
      end

      it "returns the sync report" do
        post "/api/v1/notion_sync", headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["exercise_notes"]).to eq({ "upserted" => 6, "deleted" => 1, "skipped" => 0 })
        expect(body["warmups"]).to eq({ "upserted" => 17, "deleted" => 0, "skipped" => 0 })
        expect(body["errors"]).to eq([])
      end
    end

    context "when the Notion API fails" do
      before do
        service = instance_double(NotionSyncService)
        allow(service).to receive(:sync_all).and_raise(Notion::Client::ApiError, "Notion API error: 401 Unauthorized")
        allow(NotionSyncService).to receive(:new).and_return(service)
      end

      it "returns 422 with an error message" do
        post "/api/v1/notion_sync", headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["error"]).to include("401")
      end
    end

    context "when environment variables are missing" do
      before do
        service = instance_double(NotionSyncService)
        allow(service).to receive(:sync_all).and_raise(KeyError, "key not found: \"NOTION_TOKEN\"")
        allow(NotionSyncService).to receive(:new).and_return(service)
      end

      it "returns 422 with a helpful error message" do
        post "/api/v1/notion_sync", headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["error"]).to include("環境変数")
      end
    end
  end
end
