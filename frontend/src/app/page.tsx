"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import { workoutsApi, exportApi } from "@/lib/api";
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

const GYM_TYPE_COLOR: Record<string, string> = {
  anytime: "text-indigo-400",
  personal: "text-rose-500",
};

function formatTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (!startTime) return null;
  return endTime ? `${startTime}〜${endTime}` : `${startTime}〜`;
}

function exerciseSummary(workout: Workout): string {
  if (!workout.workout_exercises?.length) return "セットなし";
  return workout.workout_exercises
    .map((we) => `${we.exercise?.name ?? "不明"} ${we.workout_sets?.length ?? 0}セット`)
    .join("、");
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${
    ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  })`;
}

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [exportUrl, setExportUrl] = useState<string>("");
  const [exportError, setExportError] = useState<string>("");

  useEffect(() => {
    workoutsApi.list()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExportState("exporting");
    setExportError("");
    try {
      const { url } = await exportApi.exportAll();
      setExportUrl(url);
      setExportState("done");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "エラーが発生しました");
      setExportState("error");
    }
  }

  const recentWorkouts = workouts.slice(0, 5);

  return (
    <ProtectedPage title="ホーム">
      <div className="px-4 py-4 space-y-5">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">累計ワークアウト</p>
          <p className="text-2xl font-bold text-gray-800">
            {workouts.length}
            <span className="text-sm font-normal text-gray-400 ml-1">回</span>
          </p>
        </div>

        {/* Export to Google Sheets */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">スプレッドシートに同期</p>
            <button
              onClick={handleExport}
              disabled={exportState === "exporting"}
              className="flex items-center gap-2 bg-green-600 text-white text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-60 hover:bg-green-700 transition-colors"
            >
              {exportState === "exporting" ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  同期中…
                </>
              ) : (
                "Google Sheetsへ"
              )}
            </button>
          </div>
          {exportState === "done" && (
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 underline break-all"
            >
              スプレッドシートを開く →
            </a>
          )}
          {exportState === "error" && (
            <p className="text-sm text-red-500">{exportError}</p>
          )}
        </div>

        {/* Recent Workouts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">直近のワークアウト</h2>
            <Link href="/workouts" className="text-sm text-indigo-600 font-medium">
              すべて見る →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : recentWorkouts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <p className="text-gray-400 text-sm mb-3">まだ記録がありません</p>
              <Link
                href="/workouts/new"
                className="inline-block bg-indigo-600 text-white text-sm px-5 py-2 rounded-xl font-medium"
              >
                最初のワークアウトを記録
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentWorkouts.map((w) => (
                <div key={w.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">
                          {formatDate(w.date)}
                        </span>
                        {formatTimeRange(w.start_time, w.end_time) && (
                          <span className="text-sm text-gray-400">
                            {formatTimeRange(w.start_time, w.end_time)}
                          </span>
                        )}
                      </div>
                      {w.gym_type && GYM_TYPE_LABEL[w.gym_type] && (
                        <span className={`text-xs font-medium ${GYM_TYPE_COLOR[w.gym_type] ?? "text-indigo-400"}`}>
                          {GYM_TYPE_LABEL[w.gym_type]}
                        </span>
                      )}
                    </div>
                    {w.condition && (
                      <span className="text-xl flex-shrink-0">{CONDITION_EMOJI[w.condition]}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {exerciseSummary(w)}
                  </p>
                  {w.memo && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{w.memo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
