module Api
  module V1
    class NotionSyncController < BaseController
      def create
        report = NotionSyncService.new(current_user).sync_all
        render json: {
          exercise_notes: {
            upserted: report.exercise_notes_upserted,
            deleted: report.exercise_notes_deleted,
            skipped: report.exercise_notes_skipped
          },
          warmups: {
            upserted: report.warmups_upserted,
            deleted: report.warmups_deleted,
            skipped: report.warmups_skipped
          },
          errors: report.errors
        }
      rescue KeyError => e
        render json: { error: "Notion連携の環境変数が設定されていません: #{e.message}" }, status: :unprocessable_entity
      rescue Notion::Client::ApiError => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
