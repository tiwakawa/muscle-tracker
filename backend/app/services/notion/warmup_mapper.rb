module Notion
  class WarmupMapper
    def self.map(page, body_markdown)
      new(page, body_markdown).map
    end

    def initialize(page, body_markdown)
      @page = page
      @props = page["properties"]
      @body_markdown = body_markdown
    end

    def map
      {
        notion_page_id: @page["id"],
        no: @props.dig("No.", "number") || @props.dig("No", "number"),
        name: title_text("名称"),
        category: multi_select("部位・目的"),
        timing: select_value("タイミング"),
        priority: select_value("優先度"),
        items: multi_select("使用アイテム"),
        status: select_value("状態"),
        body_markdown: @body_markdown
      }
    end

    private

    def title_text(prop_name)
      @props.dig(prop_name, "title")&.map { |t| t["plain_text"] }&.join
    end

    def select_value(prop_name)
      @props.dig(prop_name, "select", "name")
    end

    def multi_select(prop_name)
      (@props.dig(prop_name, "multi_select") || []).map { |o| o["name"] }
    end
  end
end
