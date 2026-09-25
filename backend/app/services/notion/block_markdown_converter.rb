module Notion
  class BlockMarkdownConverter
    LIST_TYPES = %w[bulleted_list_item numbered_list_item].freeze

    def self.convert(blocks)
      new(blocks).convert
    end

    def initialize(blocks)
      @blocks = blocks
    end

    def convert
      lines = []
      previous_type = nil

      @blocks.each do |block|
        markdown = convert_block(block)
        next if markdown.nil?

        if LIST_TYPES.include?(block["type"]) && LIST_TYPES.include?(previous_type)
          lines << "\n"
        elsif lines.any?
          lines << "\n\n"
        end
        lines << markdown
        previous_type = block["type"]
      end

      lines.join
    end

    private

    def convert_block(block)
      case block["type"]
      when "heading_1" then "# #{plain_text(block, 'heading_1')}"
      when "heading_2" then "## #{plain_text(block, 'heading_2')}"
      when "heading_3" then "### #{plain_text(block, 'heading_3')}"
      when "paragraph" then plain_text(block, "paragraph")
      when "bulleted_list_item" then "- #{plain_text(block, 'bulleted_list_item')}"
      when "numbered_list_item" then "1. #{plain_text(block, 'numbered_list_item')}"
      end
    end

    def plain_text(block, type_key)
      rich_text = block.dig(type_key, "rich_text") || []
      rich_text.map { |t| t["plain_text"] }.join
    end
  end
end
