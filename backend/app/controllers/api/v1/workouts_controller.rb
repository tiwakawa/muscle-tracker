module Api
  module V1
    class WorkoutsController < BaseController
      before_action :set_workout, only: [:show, :update, :destroy]

      def index
        workouts = current_user.workouts
                               .includes(workout_exercises: [:exercise, :workout_sets])
                               .order(date: :desc)
        render json: workouts.map { |w| workout_as_json(w) }
      end

      def show
        render json: workout_as_json(@workout)
      end

      def create
        workout = current_user.workouts.new(workout_params)
        if workout.save
          render json: workout_as_json(workout), status: :created
        else
          render json: { errors: workout.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @workout.update(workout_params)
          render json: workout_as_json(@workout)
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
        params.require(:workout).permit(:date, :condition, :memo, :start_time, :end_time, :gym_type)
      end

      def workout_as_json(workout)
        workout.as_json(include: {
          workout_exercises: {
            include: { exercise: {}, workout_sets: {} }
          }
        }).tap do |json|
          json["start_time"] = workout.start_time&.strftime("%H:%M")
          json["end_time"]   = workout.end_time&.strftime("%H:%M")
        end
      end
    end
  end
end
