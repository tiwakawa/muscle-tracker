"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ProtectedPage from "@/components/ProtectedPage";
import { bodyRecordsApi } from "@/lib/api";
import type { BodyRecord } from "@/lib/types";

// dynamic import to avoid SSR issues with recharts
const WeightChart = dynamic(() => import("@/components/WeightChart"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-8">
      <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  ),
});

function today() {
  return new Date().toLocaleDateString("sv");
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function BodyPage() {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const load = () => {
    setLoading(true);
    bodyRecordsApi
      .list()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await bodyRecordsApi.create({
        date,
        weight: weight ? parseFloat(weight) : undefined,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
      });
      setWeight("");
      setBodyFat("");
      setDate(today());
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この記録を削除しますか？")) return;
    await bodyRecordsApi.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const latest = records[0];

  return (
    <ProtectedPage title="ボディ記録">
      <div className="px-4 py-4 space-y-4">
        {/* Latest stats */}
        {latest && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">最新の体重</p>
              <p className="text-2xl font-bold text-gray-800">
                {latest.weight
                  ? `${latest.weight} kg`
                  : <span className="text-gray-300">—</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(latest.date)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">最新の体脂肪率</p>
              <p className="text-2xl font-bold text-gray-800">
                {latest.body_fat_percentage
                  ? `${latest.body_fat_percentage}%`
                  : <span className="text-gray-300">—</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(latest.date)}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
          <h2 className="font-semibold text-gray-700">推移グラフ（直近30日）</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <WeightChart
                records={records}
                dataKey="weight"
                unit="kg"
                color="#4f46e5"
                label="体重 (kg)"
              />
              <WeightChart
                records={records}
                dataKey="body_fat_percentage"
                unit="%"
                color="#10b981"
                label="体脂肪率 (%)"
              />
            </>
          )}
        </div>

        {/* Add Form */}
        {showForm ? (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4">記録を追加</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  日付
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    体重
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.0"
                      min={0}
                      step={0.1}
                      className="w-full px-3 py-2 pr-9 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-gray-400">
                      kg
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    体脂肪率
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                      placeholder="0.0"
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full px-3 py-2 pr-7 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-gray-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-500"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* History */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">記録履歴</h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">
              まだ記録がありません
            </p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {formatDate(r.date)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.weight ? `${r.weight} kg` : "—"}
                      {r.body_fat_percentage
                        ? ` ／ ${r.body_fat_percentage}%`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-emerald-600 active:scale-95 transition-all z-10"
        >
          +
        </button>
      )}
    </ProtectedPage>
  );
}
