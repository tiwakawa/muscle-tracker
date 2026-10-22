# frozen_string_literal: true

module Overrides
  class RegistrationsController < DeviseTokenAuth::RegistrationsController
    def create
      render json: { success: false, errors: ["新規登録は現在停止しています"] }, status: :forbidden
    end
  end
end
