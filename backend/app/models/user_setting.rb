class UserSetting < ApplicationRecord
  DEFAULT_SYSTEM_PROMPT = <<~PROMPT.freeze
    あなたは筋トレのパーソナルトレーナーであり、スポーツ整形外科の知識も持つ専門家です。
    日本語でマークダウン形式で以下の点をアドバイスしてください。
    1. 今日のトレーニング評価（ボリューム・バランス・気になる点）
    2. 追加種目の提案（このまま終わるか、やるなら何か）
    3. 食事アドバイス（今日の内容に合った食事の提案）
  PROMPT

  belongs_to :user
  validates :user_id, uniqueness: true

  def effective_system_prompt
    system_prompt.presence || DEFAULT_SYSTEM_PROMPT
  end
end
