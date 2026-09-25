require "rails_helper"

RSpec.describe Notion::WarmupMapper do
  describe ".map" do
    let(:page) do
      {
        "id" => "page-abc",
        "properties" => {
          "No." => { "number" => 3 },
          "名称" => { "title" => [ { "plain_text" => "肩甲骨はがし" } ] },
          "部位・目的" => { "multi_select" => [ { "name" => "肩" }, { "name" => "可動域" } ] },
          "タイミング" => { "select" => { "name" => "トレ前" } },
          "優先度" => { "select" => { "name" => "推奨" } },
          "使用アイテム" => { "multi_select" => [ { "name" => "フォームローラー" } ] },
          "状態" => { "select" => { "name" => "実行中" } }
        }
      }
    end

    it "extracts all properties and the notion page id" do
      result = described_class.map(page, "## やり方\n手順")

      expect(result).to eq(
        notion_page_id: "page-abc",
        no: 3,
        name: "肩甲骨はがし",
        category: [ "肩", "可動域" ],
        timing: "トレ前",
        priority: "推奨",
        items: [ "フォームローラー" ],
        status: "実行中",
        body_markdown: "## やり方\n手順"
      )
    end

    it "keeps no as nil when the No. property is missing, instead of coercing to 0" do
      page_without_no = page.merge("properties" => page["properties"].except("No."))

      result = described_class.map(page_without_no, "本文")

      expect(result[:no]).to be_nil
    end
  end
end
