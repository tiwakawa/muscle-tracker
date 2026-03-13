module Api
  module V1
    class AiAdvicesController < BaseController
      before_action :set_workout

      def show
        advice = @workout.ai_advices.first
        if advice
          render json: { content: advice.content, created_at: advice.created_at }
        else
          render json: { content: nil }
        end
      end

      def create
        system_prompt = current_user.user_setting&.effective_system_prompt
        service = AiAdviceService.new(@workout, system_prompt: system_prompt)
        content = service.generate_advice
        advice = AiAdvice.find_or_initialize_by(workout_id: @workout.id)
        advice.update!(content: content)
        render json: { content: advice.content, created_at: advice.updated_at }, status: :created
      rescue => e
        render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end

      private

      def set_workout
        @workout = current_user.workouts.find(params[:workout_id])
      rescue ActiveRecord::RecordNotFound
        render json: { errors: [ "Not found" ] }, status: :not_found
      end
    end
  end
end
