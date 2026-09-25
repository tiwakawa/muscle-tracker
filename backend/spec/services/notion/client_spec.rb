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
end
