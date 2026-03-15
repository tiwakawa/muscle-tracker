require "rails_helper"

RSpec.describe AiAdvice, type: :model do
  subject { build(:ai_advice) }

  describe "validations" do
    it { is_expected.to validate_presence_of(:content) }
    it { is_expected.to validate_uniqueness_of(:workout_id) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:workout) }
  end
end
