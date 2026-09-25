require "rails_helper"

RSpec.describe Notion::ExerciseNoteMapper do
  describe ".tracker_id" do
    it "extracts the tracker_id from page properties" do
      page = { "properties" => { "tracker_id" => { "number" => 21 } } }

      expect(described_class.tracker_id(page)).to eq(21)
    end

    it "returns nil when tracker_id is missing" do
      page = { "properties" => { "tracker_id" => { "number" => nil } } }

      expect(described_class.tracker_id(page)).to be_nil
    end
  end
end
