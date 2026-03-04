"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { exercisesApi, workoutsApi, workoutSetsApi } from "@/lib/api";
import type { Exercise } from "@/lib/types";

const CONDITION_OPTIONS = [
  { value: 1, emoji: "😴", label: "最悪" },
  { value: 2, emoji: "😞", label: "悪い" },
  { value: 3, emoji: "😐", label: "普通" },
  { value: 4, emoji: "😊", label: "良い" },
  { value: 5, emoji: "💪", label: "最高" },
];

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

// dbId あり → 既存セット、なし → 新規セット
interface SetDraft {
  id: string;       // React key
  dbId?: number;    // 既存セットのDB ID
  exerciseId: string;
  weight: string;
  reps: string;
}

export default function EditWorkoutPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [date, setDate] = useState("");
  const [condition, setCondition] = useState<number>(3);
  const [memo, setMemo] = useState("");
  const [sets, setSets] = useState<SetDraft[]>([]);
  const [originalSetIds, setOriginalSetIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([exercisesApi.list(), workoutsApi.get(workoutId)])
      .then(([exs, workout]) => {
        setExercises(exs);
        setDate(workout.date);
        setCondition(workout.condition ?? 3);
        setMemo(workout.memo ?? "");

        const drafts: SetDraft[] = (workout.workout_sets ?? []).map((s) => ({
          id: `db-${s.id}`,
          dbId: s.id,
          exerciseId: s.exercise_id.toString(),
          weight: s.weight ?? "",
          reps: s.reps?.toString() ?? "",
        }));
        setSets(drafts);
        setOriginalSetIds(drafts.map((d) => d.dbId!));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workoutId]);

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const addSet = () => {
    setSets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exerciseId: exercises[0]?.id.toString() ?? "",
        weight: "",
        reps: "",
      },
    ]);
  };

  const updateSet = (id: string, field: keyof SetDraft, value: string) => {
    setSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      // 1. ワークアウト本体を更新
      await workoutsApi.update(workoutId, { date, condition, memo: memo || undefined });

      // 2. 削除されたセット（元々あったが今はリストにない）
      const currentDbIds = sets.map((s) => s.dbId).filter(Boolean) as number[];
      const deletedIds = originalSetIds.filter((id) => !currentDbIds.includes(id));
      for (const dbId of deletedIds) {
        await workoutSetsApi.delete(workoutId, dbId);
      }

      // 3. セットを種目ごとに set_number を振り直しながら保存
      const setCountByExercise: Record<string, number> = {};
      for (const s of sets) {
        if (!s.exerciseId) continue;
        setCountByExercise[s.exerciseId] = (setCountByExercise[s.exerciseId] ?? 0) + 1;
        const payload = {
          exercise_id: parseInt(s.exerciseId),
          set_number: setCountByExercise[s.exerciseId],
          weight: s.weight ? parseFloat(s.weight) : undefined,
          reps: s.reps ? parseInt(s.reps) : undefined,
        };

        if (s.dbId) {
          // 既存セットを更新
          await workoutSetsApi.update(workoutId, s.dbId, payload);
        } else {
          // 新規セットを追加
          await workoutSetsApi.create(workoutId, payload);
        }
      }

      router.push("/workouts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedPage title="ワークアウト編集">
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage title="ワークアウト編集">
      <div className="px-4 py-4 space-y-4">
        {/* Date */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Condition */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">コンディション</p>
          <div className="grid grid-cols-5 gap-2">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCondition(opt.value)}
                className={`flex flex-col items-center py-2 rounded-xl border-2 transition-all ${
                  condition === opt.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            メモ（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="今日の感想など..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Sets */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600">セット一覧</p>
            <span className="text-xs text-gray-400">{sets.length} セット</span>
          </div>

          {sets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">
              下のボタンでセットを追加してください
            </p>
          ) : (
            <div className="space-y-3">
              {sets.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-start gap-2 p-3 rounded-xl ${
                    s.dbId ? "bg-indigo-50" : "bg-gray-50"
                  }`}
                >
                  <div className="text-xs text-gray-400 mt-3 w-5 text-center font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <select
                      value={s.exerciseId}
                      onChange={(e) => updateSet(s.id, "exerciseId", e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={s.weight}
                          onChange={(e) => updateSet(s.id, "weight", e.target.value)}
                          placeholder="重量"
                          min={0}
                          step={0.5}
                          className="w-full px-2 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-gray-400">kg</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={s.reps}
                          onChange={(e) => updateSet(s.id, "reps", e.target.value)}
                          placeholder="回数"
                          min={1}
                          className="w-full px-2 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-gray-400">回</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSet(s.id)}
                    className="mt-1 text-gray-300 hover:text-red-400 text-xl leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addSet}
            disabled={exercises.length === 0}
            className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-40"
          >
            + セットを追加
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? "保存中..." : "💾 変更を保存"}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full py-3 text-gray-400 text-sm"
        >
          キャンセル
        </button>
      </div>
    </ProtectedPage>
  );
}
