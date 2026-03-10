require "rails_helper"

RSpec.describe ExerciseNote, type: :model do
  subject { build(:exercise_note) }

  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:exercise) }
  end

  describe "uniqueness" do
    it "does not allow duplicate user + exercise combination" do
      existing = create(:exercise_note)
      duplicate = build(:exercise_note, user: existing.user, exercise: existing.exercise)
      expect(duplicate).not_to be_valid
    end
  end
end
