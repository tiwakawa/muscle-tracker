module Api
  module V1
    class WorkoutsController < BaseController
      before_action :set_workout, only: [:show, :update, :destroy]

      def index
        workouts = current_user.workouts
                               .includes(workout_exercises: [:exercise, :workout_sets])
                               .order(date: :desc)
        render json: workouts.as_json(include: {
          workout_exercises: {
            include: { exercise: {}, workout_sets: {} }
          }
        })
      end

      def show
        render json: @workout.as_json(include: {
          workout_exercises: {
            include: { exercise: {}, workout_sets: {} }
          }
        })
      end

      def create
        workout = current_user.workouts.new(workout_params)
        if workout.save
          render json: workout, status: :created
        else
          render json: { errors: workout.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @workout.update(workout_params)
          render json: @workout
        else
          render json: { errors: @workout.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @workout.destroy
        head :no_content
      end

      private

      def set_workout
        @workout = current_user.workouts.find(params[:id])
      end

      def workout_params
        params.require(:workout).permit(:date, :condition, :memo)
      end
    end
  end
end
