require "rails_helper"

RSpec.describe NotionSyncService do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:client) { instance_double(Notion::Client) }
  let(:exercise) { create(:exercise) }

  around do |example|
    original_exercises_db_id = ENV["NOTION_EXERCISES_DB_ID"]
    original_warmups_db_id = ENV["NOTION_WARMUPS_DB_ID"]
    ENV["NOTION_EXERCISES_DB_ID"] = "exercises-db"
    ENV["NOTION_WARMUPS_DB_ID"] = "warmups-db"
    example.run
    ENV["NOTION_EXERCISES_DB_ID"] = original_exercises_db_id
    ENV["NOTION_WARMUPS_DB_ID"] = original_warmups_db_id
  end

  def exercise_page(id:, tracker_id:)
    { "id" => id, "properties" => { "tracker_id" => { "number" => tracker_id } } }
  end

  def warmup_page(id:, no:, name: "ウォームアップ", status: "実行中")
    {
      "id" => id,
      "properties" => {
        "No." => { "number" => no },
        "名称" => { "title" => [ { "plain_text" => name } ] },
        "部位・目的" => { "multi_select" => [] },
        "タイミング" => { "select" => { "name" => "トレ前" } },
        "優先度" => { "select" => { "name" => "推奨" } },
        "使用アイテム" => { "multi_select" => [] },
        "状態" => { "select" => { "name" => status } }
      }
    }
  end

  def stub_body(page_id, markdown_blocks = [])
    allow(client).to receive(:list_block_children).with(page_id).and_return(markdown_blocks)
  end

  subject(:service) { described_class.new(user, client: client) }

  describe "#sync_all" do
    context "when Notion has one exercise page and one warmup page" do
      before do
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: exercise.id) ])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1) ])
        stub_body("ex-page-1")
        stub_body("wu-page-1")
      end

      it "creates an exercise_note for the current user and a warmup" do
        report = service.sync_all

        expect(report.exercise_notes_upserted).to eq(1)
        expect(report.warmups_upserted).to eq(1)
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_present
        expect(Warmup.find_by(notion_page_id: "wu-page-1")).to be_present
      end

      it "does not affect other users' exercise_notes" do
        other_note = create(:exercise_note, user: other_user, exercise: exercise, note: "他ユーザーのメモ")

        service.sync_all

        expect(other_note.reload.note).to eq("他ユーザーのメモ")
      end
    end

    context "when re-syncing after the warmup's No. changes but the page id stays the same" do
      it "updates the same record instead of creating a duplicate" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1) ])
        stub_body("wu-page-1")
        service.sync_all

        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 5) ])
        service.sync_all

        expect(Warmup.where(notion_page_id: "wu-page-1").count).to eq(1)
        expect(Warmup.find_by(notion_page_id: "wu-page-1").no).to eq(5)
      end
    end

    context "when re-syncing after the exercise note's body content changes in Notion" do
      it "updates the stored note to the new content" do
        allow(client).to receive(:query_database).with("warmups-db").and_return([])
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: exercise.id) ])
        stub_body("ex-page-1", [ { "type" => "paragraph", "paragraph" => { "rich_text" => [ { "plain_text" => "旧内容" } ] } } ])
        service.sync_all
        expect(user.exercise_notes.find_by(exercise_id: exercise.id).note).to eq("旧内容")

        stub_body("ex-page-1", [ { "type" => "paragraph", "paragraph" => { "rich_text" => [ { "plain_text" => "新内容" } ] } } ])
        service.sync_all

        expect(user.exercise_notes.where(exercise_id: exercise.id).count).to eq(1)
        expect(user.exercise_notes.find_by(exercise_id: exercise.id).note).to eq("新内容")
      end
    end

    context "when re-syncing after the warmup's body content changes in Notion" do
      it "updates the stored body_markdown to the new content" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1) ])
        stub_body("wu-page-1", [ { "type" => "paragraph", "paragraph" => { "rich_text" => [ { "plain_text" => "旧手順" } ] } } ])
        service.sync_all
        expect(Warmup.find_by(notion_page_id: "wu-page-1").body_markdown).to eq("旧手順")

        stub_body("wu-page-1", [ { "type" => "paragraph", "paragraph" => { "rich_text" => [ { "plain_text" => "新手順" } ] } } ])
        service.sync_all

        expect(Warmup.where(notion_page_id: "wu-page-1").count).to eq(1)
        expect(Warmup.find_by(notion_page_id: "wu-page-1").body_markdown).to eq("新手順")
      end
    end

    context "when a warmup's status changes to 中止 but the page still exists" do
      it "keeps the record instead of deleting it" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1, status: "実行中") ])
        stub_body("wu-page-1")
        service.sync_all

        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1, status: "中止") ])
        report = service.sync_all

        expect(report.warmups_deleted).to eq(0)
        expect(Warmup.find_by(notion_page_id: "wu-page-1").status).to eq("中止")
      end
    end

    context "when a page disappears from the Notion query results (deleted in Notion)" do
      it "deletes only the corresponding warmup, keeping others (complete mirror)" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1), warmup_page(id: "wu-page-2", no: 2) ])
        stub_body("wu-page-1")
        stub_body("wu-page-2")
        service.sync_all

        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-2", no: 2) ])
        report = service.sync_all

        expect(report.warmups_deleted).to eq(1)
        expect(Warmup.find_by(notion_page_id: "wu-page-1")).to be_nil
        expect(Warmup.find_by(notion_page_id: "wu-page-2")).to be_present
      end

      it "deletes only the corresponding exercise_note for the current user, keeping others" do
        other_exercise = create(:exercise)
        allow(client).to receive(:query_database).with("warmups-db").and_return([])
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: exercise.id), exercise_page(id: "ex-page-2", tracker_id: other_exercise.id) ])
        stub_body("ex-page-1")
        stub_body("ex-page-2")
        service.sync_all

        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-2", tracker_id: other_exercise.id) ])
        report = service.sync_all

        expect(report.exercise_notes_deleted).to eq(1)
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_nil
        expect(user.exercise_notes.find_by(exercise_id: other_exercise.id)).to be_present
      end
    end

    context "when a previously-synced warmup fails validation on re-sync (e.g. No. temporarily cleared in Notion)" do
      it "keeps the existing record instead of deleting it" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1) ])
        stub_body("wu-page-1")
        service.sync_all

        broken_page = warmup_page(id: "wu-page-1", no: 1)
        broken_page["properties"]["No."] = { "number" => nil }
        allow(client).to receive(:query_database).with("warmups-db").and_return([ broken_page ])
        report = service.sync_all

        expect(report.warmups_deleted).to eq(0)
        expect(report.warmups_skipped).to eq(1)
        expect(Warmup.find_by(notion_page_id: "wu-page-1")).to be_present
      end
    end

    context "when fetching a previously-synced exercise page's body fails on re-sync (network error)" do
      it "keeps the existing exercise_note instead of deleting it" do
        allow(client).to receive(:query_database).with("warmups-db").and_return([])
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: exercise.id) ])
        stub_body("ex-page-1")
        service.sync_all
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_present

        allow(client).to receive(:list_block_children).with("ex-page-1")
          .and_raise(Notion::Client::ApiError, "Notion API error: 504 timeout")
        report = service.sync_all

        expect(report.exercise_notes_deleted).to eq(0)
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_present
      end
    end

    context "when saving a previously-synced exercise_note fails on re-sync" do
      it "keeps the existing exercise_note instead of deleting it" do
        allow(client).to receive(:query_database).with("warmups-db").and_return([])
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: exercise.id) ])
        stub_body("ex-page-1")
        service.sync_all
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_present

        allow_any_instance_of(ExerciseNote).to receive(:save).and_return(false) # rubocop:disable RSpec/AnyInstance
        report = service.sync_all

        expect(report.exercise_notes_deleted).to eq(0)
        expect(user.exercise_notes.find_by(exercise_id: exercise.id)).to be_present
      end
    end

    context "when fetching a previously-synced warmup page's body fails on re-sync (network error)" do
      it "keeps the existing warmup instead of deleting it" do
        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db")
          .and_return([ warmup_page(id: "wu-page-1", no: 1) ])
        stub_body("wu-page-1")
        service.sync_all
        expect(Warmup.find_by(notion_page_id: "wu-page-1")).to be_present

        allow(client).to receive(:list_block_children).with("wu-page-1")
          .and_raise(Notion::Client::ApiError, "Notion API error: 504 timeout")
        report = service.sync_all

        expect(report.warmups_deleted).to eq(0)
        expect(Warmup.find_by(notion_page_id: "wu-page-1")).to be_present
      end
    end

    context "when Notion query results are empty" do
      it "skips deletion and records a warning instead of wiping all records" do
        create(:exercise_note, user: user, exercise: exercise)
        create(:warmup)

        allow(client).to receive(:query_database).with("exercises-db").and_return([])
        allow(client).to receive(:query_database).with("warmups-db").and_return([])

        report = service.sync_all

        expect(report.exercise_notes_deleted).to eq(0)
        expect(report.warmups_deleted).to eq(0)
        expect(user.exercise_notes.count).to eq(1)
        expect(Warmup.count).to eq(1)
        expect(report.errors).not_to be_empty
      end
    end

    context "when a tracker_id has no matching exercise in muscle-tracker" do
      it "skips the record and records an error without failing the whole sync" do
        allow(client).to receive(:query_database).with("exercises-db")
          .and_return([ exercise_page(id: "ex-page-1", tracker_id: 999_999) ])
        allow(client).to receive(:query_database).with("warmups-db").and_return([])
        stub_body("ex-page-1")

        report = service.sync_all

        expect(report.exercise_notes_upserted).to eq(0)
        expect(report.exercise_notes_skipped).to eq(1)
        expect(report.errors.join).to include("999999")
      end
    end

    context "when the Notion API is unreachable" do
      it "propagates the error" do
        allow(client).to receive(:query_database).with("exercises-db").and_raise(Notion::Client::ApiError, "Notion API error: 401")

        expect { service.sync_all }.to raise_error(Notion::Client::ApiError)
      end
    end
  end
end
