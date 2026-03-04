module Api
  module V1
    class MeController < BaseController
      def show
        render json: { status: "success", data: current_user }
      end
    end
  end
end
