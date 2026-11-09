require "rails_helper"

RSpec.describe NotionMirrorService do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:client) { instance_double(Notion::Client) }

  around do |example|
    original_warmups_db_id = ENV["NOTION_AI_MIRROR_WARMUPS_DB_ID"]
    original_exercises_db_id = ENV["NOTION_AI_MIRROR_EXERCISES_DB_ID"]
    ENV["NOTION_AI_MIRROR_WARMUPS_DB_ID"] = "ai-mirror-warmups-db"
    ENV["NOTION_AI_MIRROR_EXERCISES_DB_ID"] = "ai-mirror-exercises-db"
    example.run
    ENV["NOTION_AI_MIRROR_WARMUPS_DB_ID"] = original_warmups_db_id
    ENV["NOTION_AI_MIRROR_EXERCISES_DB_ID"] = original_exercises_db_id
  end

  subject(:service) { described_class.new(user: user, client: client) }

  before do
    allow(client).to receive(:query_database).with("ai-mirror-warmups-db").and_return([])
    allow(client).to receive(:query_database).with("ai-mirror-exercises-db").and_return([])
  end

  describe "#mirror_all" do
    context "when mirroring a warmup" do
      let!(:warmup) do
        create(:warmup, name: "肩甲骨はがし", category: [ "肩", "胸" ], timing: "トレ前",
          priority: "推奨", items: [ "チューブ", "フォームローラー" ], status: "実行中",
          body_markdown: "## やり方\n手順です")
      end

      it "creates a page with the mapped properties" do
        expect(client).to receive(:create_page).with(
          "ai-mirror-warmups-db",
          {
            "名前" => { title: [ { text: { content: "肩甲骨はがし" } } ] },
            "部位・目的" => { multi_select: [ { name: "肩" }, { name: "胸" } ] },
            "タイミング" => { select: { name: "トレ前" } },
            "優先度" => { select: { name: "推奨" } },
            "使用アイテム" => { rich_text: [ { text: { content: "チューブ、フォームローラー" } } ] },
            "本文" => { rich_text: [ { text: { content: "## やり方\n手順です" } } ] },
            "状態" => { select: { name: "実行中" } },
            "ソースID" => { rich_text: [ { text: { content: warmup.notion_page_id } } ] }
          }
        )

        service.mirror_all
      end
    end

    context "when a warmup has no timing/priority/status set" do
      let!(:warmup) { create(:warmup, timing: nil, priority: nil, status: nil, items: []) }

      it "sends a null select instead of omitting the property" do
        expect(client).to receive(:create_page) do |_db_id, properties|
          expect(properties["タイミング"]).to eq({ select: nil })
          expect(properties["優先度"]).to eq({ select: nil })
          expect(properties["状態"]).to eq({ select: nil })
        end

        service.mirror_all
      end
    end

    context "when mirroring an exercise with a note from the current user" do
      let!(:exercise) { create(:exercise, name: "スクワット", category: "legs") }
      let!(:note) { create(:exercise_note, user: user, exercise: exercise, note: "膝を内側に入れない") }

      it "includes the current user's note content" do
        expect(client).to receive(:create_page).with(
          "ai-mirror-exercises-db",
          {
            "名前" => { title: [ { text: { content: "スクワット" } } ] },
            "カテゴリ" => { select: { name: "legs" } },
            "メモ" => { rich_text: [ { text: { content: "膝を内側に入れない" } } ] },
            "ソースID" => { rich_text: [ { text: { content: "exercise-#{exercise.id}" } } ] }
          }
        )

        service.mirror_all
      end
    end

    context "when an exercise has no note from the current user" do
      let!(:exercise) { create(:exercise) }

      it "does not mirror the exercise at all" do
        expect(client).not_to receive(:create_page)

        service.mirror_all
      end
    end

    context "when another user has a note for the same exercise but the current user does not" do
      let!(:exercise) { create(:exercise) }
      let!(:other_note) { create(:exercise_note, user: other_user, exercise: exercise, note: "他ユーザーのメモ") }

      it "does not mirror the exercise for the current user" do
        expect(client).not_to receive(:create_page)

        service.mirror_all
      end
    end

    context "when the warmup's body_markdown exceeds 2000 characters" do
      let!(:warmup) { create(:warmup, body_markdown: "あ" * 2500) }

      it "splits the rich_text into multiple chunks of at most 2000 characters" do
        expect(client).to receive(:create_page) do |_db_id, properties|
          chunks = properties["本文"][:rich_text]
          expect(chunks.size).to eq(2)
          expect(chunks[0][:text][:content].length).to eq(2000)
          expect(chunks[1][:text][:content].length).to eq(500)
        end

        service.mirror_all
      end
    end
  end
end
