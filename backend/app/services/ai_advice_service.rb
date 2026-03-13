require "net/http"
require "uri"
require "json"

class AiAdviceService
  CONDITION_LABEL = {
    1 => "最悪",
    2 => "悪い",
    3 => "普通",
    4 => "良い",
    5 => "最高"
  }.freeze

  GYM_TYPE_LABEL = {
    "anytime" => "エニタイム",
    "personal" => "パーソナル"
  }.freeze

  def initialize(workout, system_prompt: nil)
    @workout = workout
    @system_prompt = system_prompt || UserSetting::DEFAULT_SYSTEM_PROMPT
  end

  def generate_advice
    text = build_workout_text
    call_claude(text)
  end

  private

  def build_workout_text
    lines = []

    header = "【トレーニング記録】#{format_date(@workout.date)}"
    header += " #{GYM_TYPE_LABEL[@workout.gym_type]}" if @workout.gym_type && GYM_TYPE_LABEL[@workout.gym_type]
    if @workout.start_time
      time_str = @workout.end_time \
        ? "#{format_time(@workout.start_time)}〜#{format_time(@workout.end_time)}" \
        : "#{format_time(@workout.start_time)}〜"
      header += " #{time_str}"
    end
    lines << header

    lines << "コンディション: #{CONDITION_LABEL[@workout.condition]}" if @workout.condition

    workout_exercises = @workout.workout_exercises
      .includes(:exercise, :workout_sets)
      .order(:order)

    if workout_exercises.any?
      lines << ""
      workout_exercises.each_with_index do |we, i|
        lines << (we.exercise&.name || "不明")
        we.workout_sets.order(:set_number).each do |ws|
          set_parts = []
          set_parts << "#{ws.weight}kg" if ws.weight
          set_parts << "#{ws.reps}回" if ws.reps
          lines << "  セット#{ws.set_number}: #{set_parts.join(' × ')}" if set_parts.any?
        end
        lines << "  当日メモ: #{we.memo}" if we.memo
        lines << "" if i < workout_exercises.length - 1
      end
    end

    if @workout.memo
      lines << ""
      lines << "ワークアウトメモ: #{@workout.memo}"
    end

    lines.join("\n")
  end

  def format_date(date)
    day_names = %w[日 月 火 水 木 金 土]
    "#{date.year}/#{date.month}/#{date.day}(#{day_names[date.wday]})"
  end

  def format_time(time)
    time.strftime("%H:%M")
  end

  def call_claude(workout_text)
    uri = URI("https://api.anthropic.com/v1/messages")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    req = Net::HTTP::Post.new(uri)
    req["x-api-key"] = ENV["ANTHROPIC_API_KEY"]
    req["anthropic-version"] = "2023-06-01"
    req["content-type"] = "application/json"
    req.body = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: @system_prompt,
      messages: [ { role: "user", content: workout_text } ]
    }.to_json

    res = http.request(req)
    raise "Anthropic API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)

    data = JSON.parse(res.body)
    data.dig("content", 0, "text") || raise("No content in Anthropic response")
  end
end
