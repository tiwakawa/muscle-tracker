"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ProtectedPage from "@/components/ProtectedPage";
import { exercisesApi } from "@/lib/api";
import type { Exercise } from "@/lib/types";

const CATEGORY_JP: Record<string, string> = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  core: "体幹",
  cardio: "有酸素",
  other: "その他",
};

const WeightHistoryChart = dynamic(() => import("@/components/WeightHistoryChart"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-8">
      <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function GraphsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<{ date: string; max_weight: number }[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    exercisesApi.list()
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoadingExercises(false));
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!id) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    exercisesApi.weightHistory(parseInt(id))
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  };

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const selectedExercise = exercises.find((e) => e.id.toString() === selectedId);

  return (
    <ProtectedPage title="グラフ">
      <div className="px-4 py-4 space-y-4">
        {/* Exercise select */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {loadingExercises ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">種目を選択</option>
              {Object.entries(grouped).map(([cat, exs]) => (
                <optgroup key={cat} label={CATEGORY_JP[cat] ?? cat}>
                  {exs.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* Chart */}
        {selectedId && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">
              {selectedExercise?.name} — 最大重量の推移
            </h2>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">記録がありません</p>
            ) : (
              <WeightHistoryChart data={history} />
            )}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
