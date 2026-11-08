require "rails_helper"
require "webmock/rspec"

RSpec.describe Notion::Client do
  let(:client) { described_class.new(api_key: "test-token") }
  let(:database_id) { "db-123" }
  let(:block_id) { "block-123" }

  describe "#query_database" do
    it "returns all results from a single page" do
      stub_request(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { "results" => [ { "id" => "page-1" } ], "has_more" => false }.to_json
        )

      expect(client.query_database(database_id)).to eq([ { "id" => "page-1" } ])
    end

    it "sends the bearer token and notion version header" do
      stub_request(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .to_return(status: 200, body: { "results" => [], "has_more" => false }.to_json)

      client.query_database(database_id)

      expect(WebMock).to have_requested(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .with(headers: { "Authorization" => "Bearer test-token", "Notion-Version" => "2022-06-28" })
    end

    it "paginates through multiple pages" do
      stub_request(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .with(body: {}.to_json)
        .to_return(
          status: 200,
          body: { "results" => [ { "id" => "page-1" } ], "has_more" => true, "next_cursor" => "cursor-1" }.to_json
        )
      stub_request(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .with(body: { start_cursor: "cursor-1" }.to_json)
        .to_return(
          status: 200,
          body: { "results" => [ { "id" => "page-2" } ], "has_more" => false }.to_json
        )

      result = client.query_database(database_id)
      expect(result).to eq([ { "id" => "page-1" }, { "id" => "page-2" } ])
    end

    it "raises ApiError when the API responds with an error" do
      stub_request(:post, "https://api.notion.com/v1/databases/#{database_id}/query")
        .to_return(status: 401, body: { "message" => "Unauthorized" }.to_json)

      expect { client.query_database(database_id) }.to raise_error(Notion::Client::ApiError, /401/)
    end
  end

  describe "#list_block_children" do
    it "returns all blocks and paginates" do
      stub_request(:get, "https://api.notion.com/v1/blocks/#{block_id}/children")
        .to_return(
          status: 200,
          body: { "results" => [ { "id" => "block-a" } ], "has_more" => true, "next_cursor" => "cursor-2" }.to_json
        )
      stub_request(:get, "https://api.notion.com/v1/blocks/#{block_id}/children?start_cursor=cursor-2")
        .to_return(
          status: 200,
          body: { "results" => [ { "id" => "block-b" } ], "has_more" => false }.to_json
        )

      result = client.list_block_children(block_id)
      expect(result).to eq([ { "id" => "block-a" }, { "id" => "block-b" } ])
    end
  end

  describe "#create_page" do
    it "wraps the given properties with the database parent" do
      stub_request(:post, "https://api.notion.com/v1/pages")
        .with(body: { parent: { database_id: database_id }, properties: { "名前" => { title: [] } } }.to_json)
        .to_return(status: 200, body: { "id" => "page-new" }.to_json)

      result = client.create_page(database_id, { "名前" => { title: [] } })

      expect(result).to eq({ "id" => "page-new" })
    end

    it "raises ApiError when the API responds with an error" do
      stub_request(:post, "https://api.notion.com/v1/pages").to_return(status: 400, body: { "message" => "Bad request" }.to_json)

      expect { client.create_page(database_id, {}) }.to raise_error(Notion::Client::ApiError, /400/)
    end
  end

  describe "#update_page" do
    it "sends the given body as-is for a properties update" do
      stub_request(:patch, "https://api.notion.com/v1/pages/page-123")
        .with(body: { properties: { "名前" => { title: [] } } }.to_json)
        .to_return(status: 200, body: { "id" => "page-123" }.to_json)

      result = client.update_page("page-123", { properties: { "名前" => { title: [] } } })

      expect(result).to eq({ "id" => "page-123" })
    end

    it "sends the given body as-is for an archive request, without wrapping it in properties" do
      stub_request(:patch, "https://api.notion.com/v1/pages/page-123")
        .with(body: { archived: true }.to_json)
        .to_return(status: 200, body: { "id" => "page-123", "archived" => true }.to_json)

      result = client.update_page("page-123", { archived: true })

      expect(result).to eq({ "id" => "page-123", "archived" => true })
    end

    it "raises ApiError when the API responds with an error" do
      stub_request(:patch, "https://api.notion.com/v1/pages/page-123").to_return(status: 404, body: { "message" => "Not found" }.to_json)

      expect { client.update_page("page-123", { archived: true }) }.to raise_error(Notion::Client::ApiError, /404/)
    end
  end
end
