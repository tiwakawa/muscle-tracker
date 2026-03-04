"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import WeightChart from "@/components/WeightChart";
import { workoutsApi, bodyRecordsApi } from "@/lib/api";
import type { Workout, BodyRecord } from "@/lib/types";

const CONDITION_EMOJI: Record<number, string> = {
  1: "😴",
  2: "😞",
  3: "😐",
  4: "😊",
  5: "💪",
};

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${
    ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  })`;
}

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([workoutsApi.list(), bodyRecordsApi.list()])
      .then(([w, b]) => {
        setWorkouts(w);
        setBodyRecords(b);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const recentWorkouts = workouts.slice(0, 5);
  const latestWeight = (() => {
    const sorted = [...bodyRecords].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    return sorted[0]?.weight ? `${sorted[0].weight} kg` : "—";
  })();

  return (
    <ProtectedPage title="💪 Muscle Tracker">
      <div className="px-4 py-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">直近の体重</p>
            <p className="text-2xl font-bold text-gray-800">{latestWeight}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">累計ワークアウト</p>
            <p className="text-2xl font-bold text-gray-800">
              {workouts.length}
              <span className="text-sm font-normal text-gray-400 ml-1">回</span>
            </p>
          </div>
        </div>

        {/* Weight Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-3">体重推移（直近30日）</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <WeightChart
              records={bodyRecords}
              dataKey="weight"
              unit="kg"
              color="#4f46e5"
              label="体重 (kg)"
            />
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
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800 text-sm">
                      {formatDate(w.date)}
                    </span>
                    {w.condition && (
                      <span className="text-xl">{CONDITION_EMOJI[w.condition]}</span>
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
