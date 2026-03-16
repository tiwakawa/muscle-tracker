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
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">累計ワークアウト</p>
          <p className="text-2xl font-bold text-gray-800">
            {workouts.length}
            <span className="text-sm font-normal text-gray-400 ml-1">回</span>
          </p>
        </div>

        {/* Workout Calendar */}
        <WorkoutCalendar workouts={workouts} loading={loading} />

      </div>
    </ProtectedPage>
  );
}
