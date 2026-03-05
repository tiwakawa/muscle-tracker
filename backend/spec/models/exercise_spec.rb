require "rails_helper"

RSpec.describe Exercise, type: :model do
  subject { build(:exercise) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(subject).to be_valid
    end

    it "requires name" do
      subject.name = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:name]).to be_present
    end

    it "requires unique name" do
      create(:exercise, name: "Bench Press")
      duplicate = build(:exercise, name: "Bench Press")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to include("has already been taken")
    end

    it "requires category" do
      subject.category = nil
      expect(subject).not_to be_valid
    end

    it "rejects invalid category" do
      subject.category = "yoga"
      expect(subject).not_to be_valid
      expect(subject.errors[:category]).to be_present
    end

    it "accepts all defined categories" do
      Exercise::CATEGORIES.each do |cat|
        exercise = build(:exercise, category: cat)
        expect(exercise).to be_valid, "expected #{cat} to be valid"
      end
    end
  end
end
