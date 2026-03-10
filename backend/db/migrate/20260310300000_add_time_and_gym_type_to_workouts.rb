class AddTimeAndGymTypeToWorkouts < ActiveRecord::Migration[8.1]
  def change
    add_column :workouts, :start_time, :time
    add_column :workouts, :end_time, :time
    add_column :workouts, :gym_type, :string
  end
end
