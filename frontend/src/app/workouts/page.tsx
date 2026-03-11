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

const CONDITION_LABEL: Record<number, string> = {
  1: "最悪",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "最高",
};

const GYM_TYPE_LABEL: Record<string, string> = {
  anytime: "エニタイム",
  personal: "パーソナル",
};

function formatTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (!startTime) return null;
  return endTime ? `${startTime}〜${endTime}` : `${startTime}〜`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${
    ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  })`;
}

function formatTimeShort(t: string): string {
  return t.slice(0, 5);
}

function buildAiText(w: Workout): string {
  const lines: string[] = [];

  let header = `【トレーニング記録】${formatDate(w.date)}`;
  if (w.gym_type && GYM_TYPE_LABEL[w.gym_type]) header += ` ${GYM_TYPE_LABEL[w.gym_type]}`;
  if (w.start_time) {
    const timeStr = w.end_time
      ? `${formatTimeShort(w.start_time)}〜${formatTimeShort(w.end_time)}`
      : `${formatTimeShort(w.start_time)}〜`;
    header += ` ${timeStr}`;
  }
  lines.push(header);

  if (w.condition) lines.push(`コンディション: ${CONDITION_LABEL[w.condition]}`);

  if (w.workout_exercises && w.workout_exercises.length > 0) {
    lines.push("");
    w.workout_exercises.forEach((we, i) => {
      lines.push(we.exercise?.name ?? "不明");
      (we.workout_sets ?? []).forEach((ws) => {
        const setParts: string[] = [];
        if (ws.weight) setParts.push(`${ws.weight}kg`);
        if (ws.reps) setParts.push(`${ws.reps}回`);
        if (setParts.length > 0) lines.push(`  セット${ws.set_number}: ${setParts.join(" × ")}`);
      });
      if (we.memo) lines.push(`  当日メモ: ${we.memo}`);
      if (i < w.workout_exercises!.length - 1) lines.push("");
    });
  }

  if (w.memo) {
    lines.push("");
    lines.push(`ワークアウトメモ: ${w.memo}`);
  }

  return lines.join("\n");
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);

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

  const handleAiCopy = async (w: Workout) => {
    await navigator.clipboard.writeText(buildAiText(w));
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

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
                  <div className="min-w-0 flex-1 mr-2">
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
                      <span className="text-xl">{CONDITION_EMOJI[w.condition]}</span>
                    )}
                    <button
                      onClick={() => handleAiCopy(w)}
                      className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-purple-50"
                    >
                      AI用にコピー
                    </button>
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

                {/* Exercises */}
                {w.workout_exercises && w.workout_exercises.length > 0 ? (
                  <div className="px-4 pb-3 space-y-1">
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">
          コピーしました
        </div>
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
