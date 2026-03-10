module Api
  module V1
    class WorkoutSetsController < BaseController
      before_action :set_workout_exercise
      before_action :set_workout_set, only: [:update, :destroy]

      def create
        workout_set = @workout_exercise.workout_sets.new(workout_set_params)
        if workout_set.save
          render json: workout_set, status: :created
        else
          render json: { errors: workout_set.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @workout_set.update(workout_set_params)
          render json: @workout_set
        else
          render json: { errors: @workout_set.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @workout_set.destroy
        head :no_content
      end

      private

      def set_workout_exercise
        workout = current_user.workouts.find(params[:workout_id])
        @workout_exercise = workout.workout_exercises.find(params[:workout_exercise_id])
      end

      def set_workout_set
        @workout_set = @workout_exercise.workout_sets.find(params[:id])
      end

      def workout_set_params
        params.require(:workout_set).permit(:set_number, :weight, :reps)
      end
    end
  end
end
