module Api
  module V1
    class WorkoutSetsController < BaseController
      before_action :set_workout
      before_action :set_workout_set, only: [:update, :destroy]

      def index
        sets = @workout.workout_sets.includes(:exercise).order(:set_number)
        render json: sets.as_json(include: :exercise)
      end

      def create
        workout_set = @workout.workout_sets.new(workout_set_params)
        if workout_set.save
          render json: workout_set.as_json(include: :exercise), status: :created
        else
          render json: { errors: workout_set.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @workout_set.update(workout_set_params)
          render json: @workout_set.as_json(include: :exercise)
        else
          render json: { errors: @workout_set.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @workout_set.destroy
        head :no_content
      end

      private

      def set_workout
        @workout = current_user.workouts.find(params[:workout_id])
      end

      def set_workout_set
        @workout_set = @workout.workout_sets.find(params[:id])
      end

      def workout_set_params
        params.require(:workout_set).permit(:exercise_id, :set_number, :weight, :reps)
      end
    end
  end
end
