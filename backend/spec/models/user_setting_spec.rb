require "rails_helper"

RSpec.describe UserSetting, type: :model do
  describe "associations" do
    it { should belong_to(:user) }
  end

  describe "validations" do
    subject { create(:user_setting) }
    it { should validate_uniqueness_of(:user_id) }
  end

  describe "#effective_system_prompt" do
    it "returns DEFAULT_SYSTEM_PROMPT when system_prompt is nil" do
      setting = build(:user_setting, system_prompt: nil)
      expect(setting.effective_system_prompt).to eq(UserSetting::DEFAULT_SYSTEM_PROMPT)
    end

    it "returns DEFAULT_SYSTEM_PROMPT when system_prompt is blank" do
      setting = build(:user_setting, system_prompt: "")
      expect(setting.effective_system_prompt).to eq(UserSetting::DEFAULT_SYSTEM_PROMPT)
    end

    it "returns the custom system_prompt when present" do
      custom_prompt = "カスタムプロンプト"
      setting = build(:user_setting, system_prompt: custom_prompt)
      expect(setting.effective_system_prompt).to eq(custom_prompt)
    end
  end

  describe "DEFAULT_SYSTEM_PROMPT" do
    it "contains the trainer role description" do
      expect(UserSetting::DEFAULT_SYSTEM_PROMPT).to include("パーソナルトレーナー")
    end

    it "mentions advice points" do
      expect(UserSetting::DEFAULT_SYSTEM_PROMPT).to include("以下の点")
    end
  end
end
