"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import AiAdviceModal from "@/components/AiAdviceModal";
import { workoutsApi } from "@/lib/api";
import { formatDate } from "@/lib/workoutUtils";
import type { Workout } from "@/lib/types";

const CONDITION_EMOJI: Record<number, string> = {
  1: "😴",
  2: "😞",
  3: "😐",
  4: "😊",
  5: "🤩",
};

const GYM_TYPE_LABEL: Record<string, string> = {
  anytime: "エニタイム",
  personal: "パーソナル",
};

function formatTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (!startTime) return null;
  return endTime ? `${startTime}〜${endTime}` : `${startTime}〜`;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdviceWorkout, setActiveAdviceWorkout] = useState<Workout | null>(null);

  const load = () => {
    setLoading(true);
    workoutsApi
      .list()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("このワークアウトを削除しますか？")) return;
    await workoutsApi.delete(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <ProtectedPage title="ワークアウト">
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">まだ記録がありません</p>
            <Link
              href="/workouts/new"
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium"
            >
              記録する
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <div key={w.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between px-4 pt-4 pb-2">
                  <div
                    className="min-w-0 flex-1 mr-2 cursor-pointer"
                    onClick={() => router.push(`/workouts/${w.id}/edit`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{formatDate(w.date)}</span>
                      {formatTimeRange(w.start_time, w.end_time) && (
                        <span className="text-sm text-gray-400">
                          {formatTimeRange(w.start_time, w.end_time)}
                        </span>
                      )}
                    </div>
                    {w.gym_type && GYM_TYPE_LABEL[w.gym_type] && (
                      <span className="text-xs text-indigo-400 font-medium">
                        {GYM_TYPE_LABEL[w.gym_type]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {w.condition && (
                      <span
                        className="text-xl cursor-pointer"
                        onClick={() => router.push(`/workouts/${w.id}/edit`)}
                      >
                        {CONDITION_EMOJI[w.condition]}
                      </span>
                    )}
                    <button
                      onClick={() => setActiveAdviceWorkout(w)}
                      className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-purple-50"
                    >
                      AIアドバイス
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Exercises */}
                {w.workout_exercises && w.workout_exercises.length > 0 ? (
                  <div
                    className="px-4 pb-3 space-y-1 cursor-pointer"
                    onClick={() => router.push(`/workouts/${w.id}/edit`)}
                  >
                    {w.workout_exercises.map((we) => (
                      <div key={we.id} className="text-sm">
                        <span className="font-medium text-gray-700">{we.exercise?.name ?? "不明"}</span>
                        <span className="text-gray-400 ml-2">
                          {we.workout_sets?.map((ws) =>
                            [ws.weight ? `${ws.weight}kg` : null, ws.reps ? `${ws.reps}回` : null]
                              .filter(Boolean)
                              .join("×")
                          ).join(" / ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="px-4 pb-3 text-sm text-gray-400 cursor-pointer"
                    onClick={() => router.push(`/workouts/${w.id}/edit`)}
                  >
                    セットなし
                  </p>
                )}

                {/* Memo */}
                {w.memo && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-50">
                    <p className="text-xs text-gray-400">{w.memo}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Advice Modal */}
      {activeAdviceWorkout && (
        <AiAdviceModal
          workout={activeAdviceWorkout}
          onClose={() => setActiveAdviceWorkout(null)}
        />
      )}

      {/* FAB */}
      <Link
        href="/workouts/new"
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 active:scale-95 transition-all z-10"
      >
        +
      </Link>
    </ProtectedPage>
  );
}
