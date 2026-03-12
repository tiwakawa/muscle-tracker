Rails.application.routes.draw do
  mount_devise_token_auth_for 'User', at: 'auth'

  namespace :api do
    namespace :v1 do
      get "me", to: "me#show"
      resources :exercises do
        member { get :last_sets }
      end
      resources :workouts do
        resources :workout_exercises, only: [:create, :update, :destroy] do
          resources :workout_sets, only: [:create, :update, :destroy]
        end
      end
      resources :body_records
      get  "exercise_notes/:exercise_id", to: "exercise_notes#show"
      put  "exercise_notes/:exercise_id", to: "exercise_notes#update"
      post "export", to: "exports#create"
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
