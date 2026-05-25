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

    it "allows blank side" do
      subject.side = ""
      expect(subject).to be_valid
    end

    it "allows 左 as side" do
      subject.side = "左"
      expect(subject).to be_valid
    end

    it "allows 右 as side" do
      subject.side = "右"
      expect(subject).to be_valid
    end

    it "rejects invalid side values" do
      subject.side = "上"
      expect(subject).not_to be_valid
      expect(subject.errors[:side]).to be_present
    end

    it "rejects duplicate exercise_id + workout_id + side" do
      subject.save!
      duplicate = build(:workout_exercise,
        workout: subject.workout,
        exercise: subject.exercise,
        side: subject.side)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:exercise_id]).to be_present
    end

    it "allows same exercise with different side" do
      subject.side = "右"
      subject.save!
      other = build(:workout_exercise,
        workout: subject.workout,
        exercise: subject.exercise,
        side: "左")
      expect(other).to be_valid
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:workout) }
    it { is_expected.to belong_to(:exercise) }
    it { is_expected.to have_many(:workout_sets).dependent(:destroy) }
  end
end
