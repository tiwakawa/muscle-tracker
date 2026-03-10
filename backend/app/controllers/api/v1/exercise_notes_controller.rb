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

      def update
        note = current_user.exercise_notes.find_or_initialize_by(exercise_id: params[:exercise_id])
        if note.update(note_params)
          render json: note
        else
          render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def note_params
        params.require(:exercise_note).permit(:note)
      end
    end
  end
end
