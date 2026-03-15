require "rails_helper"

RSpec.describe WorkoutSet, type: :model do
  let(:workout_exercise) { create(:workout_exercise) }
  subject { build(:workout_set, workout_exercise: workout_exercise) }

  describe "associations" do
    it { is_expected.to belong_to(:workout_exercise) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:set_number) }

    it "is valid with all attributes" do
      expect(subject).to be_valid
    end

    it "requires set_number to be a positive integer" do
      subject.set_number = 0
      expect(subject).not_to be_valid
      expect(subject.errors[:set_number]).to be_present
    end

    it "allows nil weight" do
      subject.weight = nil
      expect(subject).to be_valid
    end

    it "rejects negative weight" do
      subject.weight = -1
      expect(subject).not_to be_valid
    end

    it "allows nil reps" do
      subject.reps = nil
      expect(subject).to be_valid
    end

    it "rejects zero reps" do
      subject.reps = 0
      expect(subject).not_to be_valid
    end

    it "rejects non-integer reps" do
      subject.reps = 10.5
      expect(subject).not_to be_valid
    end
  end

  describe "before_validation callback" do
    it "sets workout_id from workout_exercise" do
      workout_set = build(:workout_set, workout_exercise: workout_exercise)
      workout_set.valid?
      expect(workout_set.workout_id).to eq(workout_exercise.workout_id)
    end
  end
end
