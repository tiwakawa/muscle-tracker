"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import WorkoutCalendar from "@/components/WorkoutCalendar";
import { workoutsApi } from "@/lib/api";
import type { Workout } from "@/lib/types";

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    workoutsApi.list()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedPage title="ホーム">
      <div className="px-4 py-4 space-y-5">
        {/* Stats */}
        {(() => {
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const monthlyWorkouts = workouts.filter((w) => w.date.startsWith(currentMonth));
          const anytimeCount = monthlyWorkouts.filter((w) => w.gym_type === "anytime").length;
          const personalCount = monthlyWorkouts.filter((w) => w.gym_type === "personal").length;
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-1">累計ワークアウト</p>
                <p className="text-2xl font-bold text-gray-800">
                  {workouts.length}
                  <span className="text-sm font-normal text-gray-400 ml-1">回</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-1">今月（{now.getMonth() + 1}月）</p>
                <p className="text-2xl font-bold text-gray-800">
                  {monthlyWorkouts.length}
                  <span className="text-sm font-normal text-gray-400 ml-1">回</span>
                </p>
                {(anytimeCount > 0 || personalCount > 0) && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {anytimeCount > 0 && <span className="text-indigo-500">エニタイム {anytimeCount}</span>}
                    {anytimeCount > 0 && personalCount > 0 && <span className="mx-1">/</span>}
                    {personalCount > 0 && <span className="text-rose-500">パーソナル {personalCount}</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Workout Calendar */}
        <WorkoutCalendar workouts={workouts} loading={loading} />

      </div>
    </ProtectedPage>
  );
}
