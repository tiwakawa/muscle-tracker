module Api
  module V1
    class ExerciseNotesController < BaseController
      def show
        note = current_user.exercise_notes.find_by(exercise_id: params[:exercise_id])
        if note
          render json: note
        else
          render json: { id: nil, exercise_id: params[:exercise_id].to_i, note: nil }
        end
      end
    end
  end
end
