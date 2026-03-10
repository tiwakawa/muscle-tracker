module Api
  module V1
    class WorkoutExercisesController < BaseController
      before_action :set_workout
      before_action :set_workout_exercise, only: [:update, :destroy]

      def create
        workout_exercise = @workout.workout_exercises.new(workout_exercise_params)
        if workout_exercise.save
          render json: workout_exercise.as_json(include: { exercise: {}, workout_sets: {} }), status: :created
        else
          render json: { errors: workout_exercise.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @workout_exercise.update(workout_exercise_params)
          render json: @workout_exercise.as_json(include: { exercise: {}, workout_sets: {} })
        else
          render json: { errors: @workout_exercise.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @workout_exercise.destroy
        head :no_content
      end

      private

      def set_workout
        @workout = current_user.workouts.find(params[:workout_id])
      end

      def set_workout_exercise
        @workout_exercise = @workout.workout_exercises.find(params[:id])
      end

      def workout_exercise_params
        params.require(:workout_exercise).permit(:exercise_id, :order, :memo)
      end
    end
  end
end
