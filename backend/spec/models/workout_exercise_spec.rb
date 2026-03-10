require "rails_helper"

RSpec.describe WorkoutExercise, type: :model do
  subject { build(:workout_exercise) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "requires order" do
      subject.order = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:order]).to be_present
    end

    it "requires order to be a positive integer" do
      subject.order = 0
      expect(subject).not_to be_valid
    end

    it "allows nil memo" do
      subject.memo = nil
      expect(subject).to be_valid
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:workout) }
    it { is_expected.to belong_to(:exercise) }
    it { is_expected.to have_many(:workout_sets).dependent(:destroy) }
  end
end
