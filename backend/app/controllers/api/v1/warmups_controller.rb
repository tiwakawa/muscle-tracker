module Api
  module V1
    class WarmupsController < BaseController
      def index
        render json: Warmup.order(:no)
      end
    end
  end
end
