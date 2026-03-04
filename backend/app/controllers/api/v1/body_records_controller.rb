module Api
  module V1
    class BodyRecordsController < BaseController
      before_action :set_body_record, only: [:show, :update, :destroy]

      def index
        records = current_user.body_records.order(date: :desc)
        render json: records
      end

      def show
        render json: @body_record
      end

      def create
        record = current_user.body_records.new(body_record_params)
        if record.save
          render json: record, status: :created
        else
          render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @body_record.update(body_record_params)
          render json: @body_record
        else
          render json: { errors: @body_record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @body_record.destroy
        head :no_content
      end

      private

      def set_body_record
        @body_record = current_user.body_records.find(params[:id])
      end

      def body_record_params
        params.require(:body_record).permit(:date, :weight, :body_fat_percentage)
      end
    end
  end
end
