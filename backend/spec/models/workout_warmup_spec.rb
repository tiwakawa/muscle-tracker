require "rails_helper"

RSpec.describe WorkoutWarmup, type: :model do
  subject { build(:workout_warmup) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "rejects duplicate warmup_id + workout_id" do
      subject.save!
      duplicate = build(:workout_warmup, workout: subject.workout, warmup: subject.warmup)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:warmup_id]).to be_present
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:workout) }
    it { is_expected.to belong_to(:warmup) }
  end
end
