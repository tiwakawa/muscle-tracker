module Api
  module V1
    class AiAdvicesController < BaseController
      before_action :set_workout

      def show
        advice = @workout.ai_advices.order(created_at: :desc).first
        if advice
          render json: { content: advice.content, created_at: advice.created_at }
        else
          render json: { content: nil }
        end
      end

      def create
        service = AiAdviceService.new(@workout)
        content = service.generate_advice
        advice = @workout.ai_advices.create!(content: content)
        render json: { content: advice.content, created_at: advice.created_at }, status: :created
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
