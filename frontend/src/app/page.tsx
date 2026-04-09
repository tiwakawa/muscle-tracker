"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import WorkoutCalendar from "@/components/WorkoutCalendar";
import { workoutsApi } from "@/lib/api";
import type { Workout } from "@/lib/types";

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  useEffect(() => {
    workoutsApi.list()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const monthlyWorkouts = useMemo(
    () => workouts.filter((w) => w.date.startsWith(monthPrefix)),
    [workouts, monthPrefix]
  );
  const anytimeCount = monthlyWorkouts.filter((w) => w.gym_type === "anytime").length;
  const personalCount = monthlyWorkouts.filter((w) => w.gym_type === "personal").length;

  return (
    <ProtectedPage title="ホーム">
      <div className="px-4 py-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">{selectedMonth + 1}月</p>
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
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">累計ワークアウト</p>
            <p className="text-2xl font-bold text-gray-800">
              {workouts.length}
              <span className="text-sm font-normal text-gray-400 ml-1">回</span>
            </p>
          </div>
        </div>

        {/* Workout Calendar */}
        <WorkoutCalendar
          workouts={workouts}
          loading={loading}
          onMonthChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
        />

      </div>
    </ProtectedPage>
  );
}
