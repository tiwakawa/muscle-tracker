require "rails_helper"

RSpec.describe Notion::MirrorUpserter do
  let(:client) { instance_double(Notion::Client) }
  let(:database_id) { "mirror-db" }

  def existing_page(id:, source_id:)
    { "id" => id, "properties" => { "ソースID" => { "rich_text" => [ { "plain_text" => source_id } ] } } }
  end

  describe ".call" do
    context "when the record has no existing mirrored page" do
      it "creates a new page" do
        allow(client).to receive(:query_database).with(database_id).and_return([])
        expect(client).to receive(:create_page).with(database_id, { "名前" => "新規" })

        errors = described_class.call(client: client, database_id: database_id, records: [ "record-1" ], source_key: ->(_r) { "key-1" }) { |_r, _k| { "名前" => "新規" } }

        expect(errors).to be_empty
      end
    end

    context "when the record already has a mirrored page" do
      it "updates the existing page instead of creating a duplicate" do
        allow(client).to receive(:query_database).with(database_id)
          .and_return([ existing_page(id: "page-1", source_id: "key-1") ])
        expect(client).to receive(:update_page).with("page-1", { properties: { "名前" => "更新" } })
        expect(client).not_to receive(:create_page)

        errors = described_class.call(client: client, database_id: database_id, records: [ "record-1" ], source_key: ->(_r) { "key-1" }) { |_r, _k| { "名前" => "更新" } }

        expect(errors).to be_empty
      end
    end

    context "when a mirrored page no longer has a corresponding source record" do
      it "archives the stale page" do
        allow(client).to receive(:query_database).with(database_id)
          .and_return([ existing_page(id: "page-stale", source_id: "key-gone") ])
        expect(client).to receive(:update_page).with("page-stale", { archived: true })

        errors = described_class.call(client: client, database_id: database_id, records: [], source_key: ->(_r) { nil }) { |_r, _k| {} }

        expect(errors).to be_empty
      end
    end

    context "when one record fails to write" do
      it "does not stop processing of the remaining records" do
        allow(client).to receive(:query_database).with(database_id).and_return([])
        allow(client).to receive(:create_page).with(database_id, { "名前" => "失敗" })
          .and_raise(Notion::Client::ApiError, "Notion API error: 500")
        expect(client).to receive(:create_page).with(database_id, { "名前" => "成功" })

        errors = described_class.call(
          client: client, database_id: database_id,
          records: [ "fail", "ok" ],
          source_key: ->(r) { r }
        ) { |r, _k| { "名前" => r == "fail" ? "失敗" : "成功" } }

        expect(errors.size).to eq(1)
        expect(errors.first).to include("key=fail")
      end
    end

    context "when archiving a stale page fails" do
      it "records the error without raising" do
        allow(client).to receive(:query_database).with(database_id)
          .and_return([ existing_page(id: "page-stale", source_id: "key-gone") ])
        allow(client).to receive(:update_page).with("page-stale", { archived: true })
          .and_raise(Notion::Client::ApiError, "Notion API error: 500")

        errors = described_class.call(client: client, database_id: database_id, records: [], source_key: ->(_r) { nil }) { |_r, _k| {} }

        expect(errors.size).to eq(1)
        expect(errors.first).to include("key=key-gone")
      end
    end
  end
end
