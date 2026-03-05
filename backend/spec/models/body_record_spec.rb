require "rails_helper"

RSpec.describe BodyRecord, type: :model do
  subject { build(:body_record) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "requires date" do
      subject.date = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:date]).to be_present
    end

    it "allows nil weight and body_fat_percentage" do
      subject.weight = nil
      subject.body_fat_percentage = nil
      expect(subject).to be_valid
    end

    it "rejects weight of 0 or less" do
      subject.weight = 0
      expect(subject).not_to be_valid
      expect(subject.errors[:weight]).to be_present
    end

    it "accepts positive weight" do
      subject.weight = 65.5
      expect(subject).to be_valid
    end

    it "rejects body_fat_percentage below 0" do
      subject.body_fat_percentage = -1
      expect(subject).not_to be_valid
    end

    it "rejects body_fat_percentage above 100" do
      subject.body_fat_percentage = 101
      expect(subject).not_to be_valid
    end

    it "accepts body_fat_percentage at boundary values (0 and 100)" do
      subject.body_fat_percentage = 0
      expect(subject).to be_valid
      subject.body_fat_percentage = 100
      expect(subject).to be_valid
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end
end
