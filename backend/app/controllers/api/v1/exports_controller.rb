module Api
  module V1
    class ExportsController < BaseController
      def create
        exporter = GoogleSheetsExporter.new(current_user)
        url = exporter.export_current_month
        render json: { url: url }
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
