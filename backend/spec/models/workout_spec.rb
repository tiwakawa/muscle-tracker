require "rails_helper"

RSpec.describe Workout, type: :model do
  subject { build(:workout) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "requires date" do
      subject.date = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:date]).to be_present
    end

    it "allows nil condition" do
      subject.condition = nil
      expect(subject).to be_valid
    end

    it "accepts condition values 1 through 5" do
      (1..5).each do |val|
        subject.condition = val
        expect(subject).to be_valid, "expected condition #{val} to be valid"
      end
    end

    it "rejects condition below 1" do
      subject.condition = 0
      expect(subject).not_to be_valid
    end

    it "rejects condition above 5" do
      subject.condition = 6
      expect(subject).not_to be_valid
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:workout_exercises).dependent(:destroy) }
    it { is_expected.to have_many(:workout_sets).through(:workout_exercises) }
  end
end
