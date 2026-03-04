Rails.application.routes.draw do
  mount_devise_token_auth_for 'User', at: 'auth'

  namespace :api do
    namespace :v1 do
      get "me", to: "me#show"
      resources :exercises
      resources :workouts do
        resources :workout_sets, only: [:index, :create, :update, :destroy]
      end
      resources :body_records
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
