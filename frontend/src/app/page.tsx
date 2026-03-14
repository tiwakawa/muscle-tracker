"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import WorkoutCalendar from "@/components/WorkoutCalendar";
import { workoutsApi, exportApi } from "@/lib/api";
import type { Workout } from "@/lib/types";

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

        {/* Workout Calendar */}
        <WorkoutCalendar workouts={workouts} loading={loading} />

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
      </div>
    </ProtectedPage>
  );
}
