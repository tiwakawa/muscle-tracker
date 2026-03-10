"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { exercisesApi, workoutsApi, workoutExercisesApi, workoutSetsApi } from "@/lib/api";
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

interface SetDraft {
  id: string;
  weight: string;
  reps: string;
}

interface ExerciseBlock {
  id: string;
  exerciseId: string;
  memo: string;
  sets: SetDraft[];
}

function today() {
  return new Date().toLocaleDateString("sv");
}

function newSet(): SetDraft {
  return { id: crypto.randomUUID(), weight: "", reps: "" };
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [date, setDate] = useState(today());
  const [condition, setCondition] = useState<number>(3);
  const [memo, setMemo] = useState("");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    exercisesApi.list().then(setExercises).catch(console.error);
  }, []);

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exerciseId: exercises[0]?.id.toString() ?? "",
        memo: "",
        sets: [newSet()],
      },
    ]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const updateBlock = (blockId: string, field: "exerciseId" | "memo", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b))
    );
  };

  const addSetToBlock = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, sets: [...b.sets, newSet()] } : b))
    );
  };

  const updateSet = (blockId: string, setId: string, field: "weight" | "reps", value: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, sets: b.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : b
      )
    );
  };

  const removeSet = (blockId: string, setId: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, sets: b.sets.filter((s) => s.id !== setId) } : b
      )
    );
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const workout = await workoutsApi.create({
        date,
        condition,
        memo: memo || undefined,
      });

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block.exerciseId) continue;

        const we = await workoutExercisesApi.create(workout.id, {
          exercise_id: parseInt(block.exerciseId),
          order: i + 1,
          memo: block.memo || undefined,
        });

        for (let j = 0; j < block.sets.length; j++) {
          const s = block.sets[j];
          await workoutSetsApi.create(workout.id, we.id, {
            set_number: j + 1,
            weight: s.weight ? parseFloat(s.weight) : undefined,
            reps: s.reps ? parseInt(s.reps) : undefined,
          });
        }
      }

      router.push("/workouts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedPage title="ワークアウト記録">
      <div className="px-4 py-4 space-y-4">
        {/* Date */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">日付</label>
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
                <span className="text-[10px] text-gray-500 mt-0.5">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workout memo */}
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

        {/* Exercise blocks */}
        {blocks.map((block, blockIndex) => (
          <div key={block.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Block header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium w-5 text-center">
                {blockIndex + 1}
              </span>
              <select
                value={block.exerciseId}
                onChange={(e) => updateBlock(block.id, "exerciseId", e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
              <button
                onClick={() => removeBlock(block.id)}
                className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              {/* Exercise memo */}
              <input
                type="text"
                value={block.memo}
                onChange={(e) => updateBlock(block.id, "memo", e.target.value)}
                placeholder="種目メモ（任意）"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />

              {/* Sets */}
              <div className="space-y-2">
                {block.sets.map((s, setIndex) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8 text-center font-medium flex-shrink-0">
                      {setIndex + 1}セット
                    </span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={s.weight}
                        onChange={(e) => updateSet(block.id, s.id, "weight", e.target.value)}
                        placeholder="重量"
                        min={0}
                        step={0.5}
                        className="w-full px-2 py-2 pr-7 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-gray-400">kg</span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={s.reps}
                        onChange={(e) => updateSet(block.id, s.id, "reps", e.target.value)}
                        placeholder="回数"
                        min={1}
                        className="w-full px-2 py-2 pr-7 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-gray-400">回</span>
                    </div>
                    <button
                      onClick={() => removeSet(block.id, s.id)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add set */}
              <button
                onClick={() => addSetToBlock(block.id)}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                + セットを追加
              </button>
            </div>
          </div>
        ))}

        {/* Add exercise block */}
        <button
          onClick={addBlock}
          disabled={exercises.length === 0}
          className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-40"
        >
          + 種目を追加
        </button>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? "保存中..." : "💾 保存する"}
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
