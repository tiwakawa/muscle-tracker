import type {
  AuthTokens,
  Exercise,
  ExerciseNote,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  BodyRecord,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TOKEN_KEY = "muscle-tracker-auth";

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

function pickTokensFromHeaders(headers: Headers): AuthTokens | null {
  const token = headers.get("access-token");
  const client = headers.get("client");
  const uid = headers.get("uid");
  if (token && client && uid) {
    return { "access-token": token, client, uid, "token-type": "Bearer" };
  }
  return null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokens) Object.assign(headers, tokens);

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Devise Token Auth rotates tokens on each request
  const newTokens = pickTokensFromHeaders(res.headers);
  if (newTokens) setTokens(newTokens);

  if (res.status === 401) {
    clearTokens();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data.errors as string[] | undefined)?.join(", ") ?? "API Error"
    );
  }
  return data as T;
}

// ---- Auth ----
export const authApi = {
  signIn: (email: string, password: string) =>
    request<{ data: { id: number; email: string; name: string | null } }>(
      "POST",
      "/auth/sign_in",
      { email, password }
    ),
  signUp: (email: string, password: string, passwordConfirmation: string) =>
    request<{ data: { id: number; email: string } }>("POST", "/auth", {
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  signOut: () => request<void>("DELETE", "/auth/sign_out"),
  me: () =>
    request<{ status: string; data: { id: number; email: string; name: string | null } }>(
      "GET",
      "/api/v1/me"
    ),
};

// ---- Exercises ----
export const exercisesApi = {
  list: () => request<Exercise[]>("GET", "/api/v1/exercises"),
};

// ---- Workouts ----
export const workoutsApi = {
  list: () => request<Workout[]>("GET", "/api/v1/workouts"),
  get: (id: number) => request<Workout>("GET", `/api/v1/workouts/${id}`),
  create: (data: {
    date: string;
    condition?: number;
    memo?: string;
    start_time?: string;
    end_time?: string;
    gym_type?: string;
  }) => request<Workout>("POST", "/api/v1/workouts", { workout: data }),
  update: (
    id: number,
    data: Partial<{
      date: string;
      condition: number;
      memo: string | null;
      start_time: string | null;
      end_time: string | null;
      gym_type: string | null;
    }>
  ) => request<Workout>("PUT", `/api/v1/workouts/${id}`, { workout: data }),
  delete: (id: number) => request<void>("DELETE", `/api/v1/workouts/${id}`),
};

// ---- Workout Exercises ----
export const workoutExercisesApi = {
  create: (
    workoutId: number,
    data: { exercise_id: number; order: number; memo?: string | null }
  ) =>
    request<WorkoutExercise>(
      "POST",
      `/api/v1/workouts/${workoutId}/workout_exercises`,
      { workout_exercise: data }
    ),
  update: (
    workoutId: number,
    id: number,
    data: Partial<{ exercise_id: number; order: number; memo: string | null }>
  ) =>
    request<WorkoutExercise>(
      "PUT",
      `/api/v1/workouts/${workoutId}/workout_exercises/${id}`,
      { workout_exercise: data }
    ),
  delete: (workoutId: number, id: number) =>
    request<void>(
      "DELETE",
      `/api/v1/workouts/${workoutId}/workout_exercises/${id}`
    ),
};

// ---- Workout Sets ----
export const workoutSetsApi = {
  create: (
    workoutId: number,
    workoutExerciseId: number,
    data: { set_number: number; weight?: number; reps?: number }
  ) =>
    request<WorkoutSet>(
      "POST",
      `/api/v1/workouts/${workoutId}/workout_exercises/${workoutExerciseId}/workout_sets`,
      { workout_set: data }
    ),
  update: (
    workoutId: number,
    workoutExerciseId: number,
    id: number,
    data: { set_number: number; weight?: number; reps?: number }
  ) =>
    request<WorkoutSet>(
      "PUT",
      `/api/v1/workouts/${workoutId}/workout_exercises/${workoutExerciseId}/workout_sets/${id}`,
      { workout_set: data }
    ),
  delete: (workoutId: number, workoutExerciseId: number, id: number) =>
    request<void>(
      "DELETE",
      `/api/v1/workouts/${workoutId}/workout_exercises/${workoutExerciseId}/workout_sets/${id}`
    ),
};

// ---- Exercise Notes ----
export const exerciseNotesApi = {
  get: (exerciseId: number) =>
    request<ExerciseNote>("GET", `/api/v1/exercise_notes/${exerciseId}`),
  upsert: (exerciseId: number, note: string) =>
    request<ExerciseNote>("PUT", `/api/v1/exercise_notes/${exerciseId}`, {
      exercise_note: { note },
    }),
};

// ---- Export ----
export const exportApi = {
  exportCurrentMonth: () =>
    request<{ url: string }>("POST", "/api/v1/export"),
};

// ---- Body Records ----
export const bodyRecordsApi = {
  list: () => request<BodyRecord[]>("GET", "/api/v1/body_records"),
  create: (data: {
    date: string;
    weight?: number;
    body_fat_percentage?: number;
  }) =>
    request<BodyRecord>("POST", "/api/v1/body_records", { body_record: data }),
  delete: (id: number) =>
    request<void>("DELETE", `/api/v1/body_records/${id}`),
};
