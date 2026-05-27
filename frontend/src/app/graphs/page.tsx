"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getTokens, exercisesApi } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import type { Exercise } from "@/lib/types";

const CATEGORY_JP: Record<string, string> = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  core: "腹・体幹",
  cardio: "有酸素",
  other: "その他",
};

const WeightHistoryChart = dynamic(() => import("@/components/WeightHistoryChart"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-8">
      <div className="animate-spin h-6 w-6 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
    </div>
  ),
});

export default function GraphsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<{ date: string; max_weight: number }[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    exercisesApi.list()
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoadingExercises(false));
  }, [ready]);

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

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Top app bar */}
      <div className="sticky top-0 z-50 bg-[#FAFAFA] flex items-center px-5 h-[60px]">
        <span className="text-xl font-bold text-gray-900 tracking-tight">グラフ</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Exercise select */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {loadingExercises ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-6 w-6 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
            </div>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5bf2]/40"
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
                <div className="animate-spin h-6 w-6 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">記録がありません</p>
            ) : (
              <WeightHistoryChart data={history} />
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
