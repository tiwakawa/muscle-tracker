module Api
  module V1
    class UserSettingsController < BaseController
      def show
        setting = current_user.user_setting
        render json: {
          system_prompt: setting&.system_prompt,
          default_system_prompt: UserSetting::DEFAULT_SYSTEM_PROMPT
        }
      end

      def update
        setting = current_user.user_setting || current_user.build_user_setting
        if setting.update(user_setting_params)
          render json: {
            system_prompt: setting.system_prompt,
            default_system_prompt: UserSetting::DEFAULT_SYSTEM_PROMPT
          }
        else
          render json: { errors: setting.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def user_setting_params
        params.require(:user_setting).permit(:system_prompt)
      end
    end
  end
end
