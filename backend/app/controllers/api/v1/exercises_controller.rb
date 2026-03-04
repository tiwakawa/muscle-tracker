module Api
  module V1
    class ExercisesController < BaseController
      before_action :set_exercise, only: [:show, :update, :destroy]

      def index
        exercises = Exercise.order(:category, :name)
        render json: exercises
      end

      def show
        render json: @exercise
      end

      def create
        exercise = Exercise.new(exercise_params)
        if exercise.save
          render json: exercise, status: :created
        else
          render json: { errors: exercise.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @exercise.update(exercise_params)
          render json: @exercise
        else
          render json: { errors: @exercise.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @exercise.destroy
        head :no_content
      end

      private

      def set_exercise
        @exercise = Exercise.find(params[:id])
      end

      def exercise_params
        params.require(:exercise).permit(:name, :category)
      end
    end
  end
end
