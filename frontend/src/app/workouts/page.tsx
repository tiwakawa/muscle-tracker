"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { workoutsApi } from "@/lib/api";
import type { Workout } from "@/lib/types";

const CONDITION_EMOJI: Record<number, string> = {
  1: "😴",
  2: "😞",
  3: "😐",
  4: "😊",
  5: "💪",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${
    ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  })`;
}

function exerciseSummary(workout: Workout): string {
  if (!workout.workout_sets?.length) return "セットなし";
  const counts: Record<string, number> = {};
  for (const s of workout.workout_sets) {
    const name = s.exercise?.name ?? "不明";
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([n, c]) => `${n} ${c}セット`)
    .join("、");
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

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
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <span className="font-bold text-gray-800">{formatDate(w.date)}</span>
                  <div className="flex items-center gap-3">
                    {w.condition && (
                      <span className="text-xl">{CONDITION_EMOJI[w.condition]}</span>
                    )}
                    <button
                      onClick={() => router.push(`/workouts/${w.id}/edit`)}
                      className="text-xs text-indigo-400 hover:text-indigo-600 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Sets */}
                {w.workout_sets && w.workout_sets.length > 0 ? (
                  <div className="px-4 pb-3 space-y-1">
                    {(() => {
                      // Group by exercise
                      const groups: Record<string, { name: string; sets: typeof w.workout_sets }> = {};
                      for (const s of w.workout_sets!) {
                        const name = s.exercise?.name ?? "不明";
                        if (!groups[name]) groups[name] = { name, sets: [] };
                        groups[name].sets!.push(s);
                      }
                      return Object.values(groups).map((g) => (
                        <div key={g.name} className="text-sm">
                          <span className="font-medium text-gray-700">{g.name}</span>
                          <span className="text-gray-400 ml-2">
                            {g.sets!.map((s) =>
                              [s.weight ? `${s.weight}kg` : null, s.reps ? `${s.reps}回` : null]
                                .filter(Boolean)
                                .join("×")
                            ).join(" / ")}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-sm text-gray-400">セットなし</p>
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
