export interface Exercise {
  id: number;
  name: string;
  category: string;
  created_at: string;
}

export interface WorkoutSet {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  weight: string | null;
  reps: number | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  exercise_id: number;
  order: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
  exercise?: Exercise;
  workout_sets?: WorkoutSet[];
}

export interface Workout {
  id: number;
  user_id: number;
  date: string;
  condition: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  workout_exercises?: WorkoutExercise[];
}

export interface BodyRecord {
  id: number;
  user_id: number;
  date: string;
  weight: string | null;
  body_fat_percentage: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  uid: string;
}

export interface ExerciseNote {
  id: number | null;
  exercise_id: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  "access-token": string;
  client: string;
  uid: string;
  "token-type": string;
}
