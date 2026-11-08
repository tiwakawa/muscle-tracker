module Notion
  class MirrorUpserter
    def self.call(client:, database_id:, records:, source_key:, &to_properties)
      errors = []
      # query_databaseはアーカイブ(ゴミ箱)済みページを結果に含めないため、一度アーカイブされた
      # ソースIDが後で復活すると既存ページとして検出できず、create_pageで新規ページが作られる
      # (アーカイブ済みの方は残置)。実害はゴミ箱に無効ページが残るだけでNotion側が30日で自動
      # 完全削除するため軽微と判断し、対処(Search API導入等)は見送っている。
      existing_by_key = client.query_database(database_id).each_with_object({}) { |p, h|
        key = p.dig("properties", "ソースID", "rich_text")&.first&.dig("plain_text")
        h[key] = p["id"] if key
      }

      synced_keys = []
      records.each do |record|
        key = source_key.call(record)
        synced_keys << key
        properties = to_properties.call(record, key)
        page_id = existing_by_key[key]
        page_id ? client.update_page(page_id, { properties: properties }) : client.create_page(database_id, properties)
      rescue Notion::Client::ApiError => e
        errors << "ミラー書き込みに失敗(key=#{key}): #{e.message}"
      end

      stale_keys = existing_by_key.keys - synced_keys
      stale_keys.each do |key|
        client.update_page(existing_by_key[key], { archived: true })
      rescue Notion::Client::ApiError => e
        errors << "孤立ページのアーカイブに失敗(key=#{key}): #{e.message}"
      end

      errors
    end
  end
end
