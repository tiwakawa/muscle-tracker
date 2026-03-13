Rails.application.routes.draw do
  mount_devise_token_auth_for 'User', at: 'auth'

  namespace :api do
    namespace :v1 do
      get "me", to: "me#show"
      resources :exercises do
        member do
          get :last_sets
          get :weight_history
        end
      end
      resources :workouts do
        resource :ai_advice, only: [:show, :create]
        resources :workout_exercises, only: [:create, :update, :destroy] do
          resources :workout_sets, only: [:create, :update, :destroy]
        end
      end
get  "exercise_notes/:exercise_id", to: "exercise_notes#show"
      put  "exercise_notes/:exercise_id", to: "exercise_notes#update"
      post "export", to: "exports#create"
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
