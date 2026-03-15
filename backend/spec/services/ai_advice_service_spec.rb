require "rails_helper"
require "webmock/rspec"

RSpec.describe AiAdviceService do
  let(:user) { create(:user) }
  let(:workout) { create(:workout, user: user, date: "2026-03-01", condition: 4) }

  def stub_anthropic_success(text: "良いトレーニングでした")
    stub_request(:post, "https://api.anthropic.com/v1/messages")
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { "content" => [ { "type" => "text", "text" => text } ] }.to_json
      )
  end

  def stub_anthropic_error(status: 500)
    stub_request(:post, "https://api.anthropic.com/v1/messages")
      .to_return(
        status: status,
        headers: { "Content-Type" => "application/json" },
        body: { "error" => { "message" => "Internal Server Error" } }.to_json
      )
  end

  describe "#generate_advice" do
    context "when API returns success" do
      before { stub_anthropic_success }

      it "returns the advice text" do
        result = described_class.new(workout).generate_advice
        expect(result).to eq("良いトレーニングでした")
      end

      it "sends request to Anthropic API with correct model" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["model"] == "claude-haiku-4-5-20251001" }
      end

      it "uses default system_prompt when not provided" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["system"] == UserSetting::DEFAULT_SYSTEM_PROMPT }
      end

      it "uses custom system_prompt when provided" do
        described_class.new(workout, system_prompt: "カスタムプロンプト").generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["system"] == "カスタムプロンプト" }
      end

      it "includes workout date in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["messages"][0]["content"].include?("2026") }
      end

      it "includes condition label in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["messages"][0]["content"].include?("良い") }
      end
    end

    context "when workout has gym_type" do
      let(:workout) { create(:workout, user: user, date: "2026-03-01", gym_type: "personal") }

      before { stub_anthropic_success }

      it "includes gym type label in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["messages"][0]["content"].include?("パーソナル") }
      end
    end

    context "when workout has exercises and sets" do
      let(:exercise) { create(:exercise, name: "ベンチプレス") }
      let(:workout_exercise) { create(:workout_exercise, workout: workout, exercise: exercise, order: 1) }

      before do
        create(:workout_set, workout_exercise: workout_exercise, weight: 80.0, reps: 10, set_number: 1)
        stub_anthropic_success
      end

      it "includes exercise name in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["messages"][0]["content"].include?("ベンチプレス") }
      end

      it "includes weight and reps in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req|
            content = JSON.parse(req.body)["messages"][0]["content"]
            content.include?("80.0kg") && content.include?("10回")
          }
      end
    end

    context "when workout has a memo" do
      let(:workout) { create(:workout, user: user, date: "2026-03-01", memo: "調子が良かった") }

      before { stub_anthropic_success }

      it "includes memo in message content" do
        described_class.new(workout).generate_advice
        expect(WebMock).to have_requested(:post, "https://api.anthropic.com/v1/messages")
          .with { |req| JSON.parse(req.body)["messages"][0]["content"].include?("調子が良かった") }
      end
    end

    context "when API returns error status" do
      before { stub_anthropic_error(status: 500) }

      it "raises an error with API error message" do
        expect { described_class.new(workout).generate_advice }
          .to raise_error(RuntimeError, /Anthropic API error/)
      end
    end

    context "when API returns empty content" do
      before do
        stub_request(:post, "https://api.anthropic.com/v1/messages")
          .to_return(
            status: 200,
            headers: { "Content-Type" => "application/json" },
            body: { "content" => [] }.to_json
          )
      end

      it "raises an error" do
        expect { described_class.new(workout).generate_advice }
          .to raise_error(RuntimeError, /No content/)
      end
    end
  end
end
