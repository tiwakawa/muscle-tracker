require "rails_helper"

RSpec.describe Warmup, type: :model do
  subject { build(:warmup) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "requires notion_page_id" do
      subject.notion_page_id = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:notion_page_id]).to be_present
    end

    it "requires unique notion_page_id" do
      create(:warmup, notion_page_id: "notion-page-dup")
      duplicate = build(:warmup, notion_page_id: "notion-page-dup")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:notion_page_id]).to include("has already been taken")
    end

    it "requires name" do
      subject.name = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:name]).to be_present
    end

    it "requires no" do
      subject.no = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:no]).to be_present
    end
  end

  describe "associations" do
    it { is_expected.to have_many(:workout_warmups).dependent(:destroy) }
    it { is_expected.to have_many(:workouts).through(:workout_warmups) }

    it "destroys dependent workout_warmups when the warmup is destroyed" do
      warmup = create(:warmup)
      workout_warmup = create(:workout_warmup, warmup: warmup)

      expect { warmup.destroy }.to change(WorkoutWarmup, :count).by(-1)
      expect(WorkoutWarmup.exists?(workout_warmup.id)).to be false
    end
  end
end
