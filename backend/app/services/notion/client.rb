require "net/http"
require "uri"
require "json"

module Notion
  class Client
    API_BASE = "https://api.notion.com/v1".freeze
    NOTION_VERSION = "2022-06-28".freeze

    class ApiError < StandardError; end

    def initialize(api_key: ENV.fetch("NOTION_TOKEN"))
      @api_key = api_key
    end

    def query_database(database_id)
      paginate do |cursor|
        body = {}
        body[:start_cursor] = cursor if cursor
        post("/databases/#{database_id}/query", body)
      end
    end

    def list_block_children(block_id)
      paginate do |cursor|
        query = {}
        query[:start_cursor] = cursor if cursor
        get("/blocks/#{block_id}/children", query)
      end
    end

    private

    def paginate
      results = []
      cursor = nil
      loop do
        res = yield(cursor)
        results.concat(res["results"])
        break unless res["has_more"]
        cursor = res["next_cursor"]
      end
      results
    end

    def post(path, body)
      request(Net::HTTP::Post, path, body: body)
    end

    def get(path, query = {})
      request(Net::HTTP::Get, path, query: query)
    end

    def request(http_method_class, path, body: nil, query: {})
      uri = URI(API_BASE + path)
      uri.query = URI.encode_www_form(query) if query.any?

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 15

      req = http_method_class.new(uri)
      req["Authorization"] = "Bearer #{@api_key}"
      req["Notion-Version"] = NOTION_VERSION
      req["Content-Type"] = "application/json"
      req.body = body.to_json if body

      res = http.request(req)
      raise ApiError, "Notion API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)

      JSON.parse(res.body)
    end
  end
end
