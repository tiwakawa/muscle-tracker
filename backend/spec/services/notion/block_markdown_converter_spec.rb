require "rails_helper"

RSpec.describe Notion::BlockMarkdownConverter do
  def rich_text_block(type, text)
    { "type" => type, type => { "rich_text" => [ { "plain_text" => text } ] } }
  end

  describe ".convert" do
    it "converts heading_1/2/3 to Markdown headings" do
      blocks = [
        rich_text_block("heading_1", "見出し1"),
        rich_text_block("heading_2", "見出し2"),
        rich_text_block("heading_3", "見出し3")
      ]

      expect(described_class.convert(blocks)).to eq("# 見出し1\n\n## 見出し2\n\n### 見出し3")
    end

    it "converts paragraph blocks" do
      blocks = [ rich_text_block("paragraph", "本文です") ]
      expect(described_class.convert(blocks)).to eq("本文です")
    end

    it "converts consecutive bulleted_list_item blocks with single newline joins" do
      blocks = [
        rich_text_block("bulleted_list_item", "項目1"),
        rich_text_block("bulleted_list_item", "項目2")
      ]

      expect(described_class.convert(blocks)).to eq("- 項目1\n- 項目2")
    end

    it "converts consecutive numbered_list_item blocks with single newline joins" do
      blocks = [
        rich_text_block("numbered_list_item", "手順1"),
        rich_text_block("numbered_list_item", "手順2")
      ]

      expect(described_class.convert(blocks)).to eq("1. 手順1\n1. 手順2")
    end

    it "separates a heading from a following list with a blank line" do
      blocks = [
        rich_text_block("heading_2", "やり方"),
        rich_text_block("bulleted_list_item", "項目1")
      ]

      expect(described_class.convert(blocks)).to eq("## やり方\n\n- 項目1")
    end

    it "skips unsupported block types without stopping conversion" do
      blocks = [
        rich_text_block("paragraph", "前"),
        { "type" => "divider", "divider" => {} },
        rich_text_block("paragraph", "後")
      ]

      expect(described_class.convert(blocks)).to eq("前\n\n後")
    end

    it "returns an empty string for no blocks" do
      expect(described_class.convert([])).to eq("")
    end
  end
end
