"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { exercisesApi, workoutsApi, workoutExercisesApi, workoutSetsApi, exerciseNotesApi } from "@/lib/api";
import type { Exercise } from "@/lib/types";

const CONDITION_OPTIONS = [
  { value: 1, emoji: "😴", label: "最悪" },
  { value: 2, emoji: "😞", label: "悪い" },
  { value: 3, emoji: "😐", label: "普通" },
  { value: 4, emoji: "😊", label: "良い" },
  { value: 5, emoji: "💪", label: "最高" },
];

const GYM_TYPE_OPTIONS = [
  { value: "anytime", label: "エニタイム" },
  { value: "personal", label: "パーソナル" },
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

interface NoteModal {
  exerciseId: number;
  exerciseName: string;
  note: string;
  loading: boolean;
  saving: boolean;
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [gymType, setGymType] = useState("");
  const [memo, setMemo] = useState("");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [lastSetsMap, setLastSetsMap] = useState<Record<string, { weight: string | null; reps: number | null }[]>>({});
  const focusSetIdRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModal | null>(null);

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
        exerciseId: "",
        memo: "",
        sets: [newSet()],
      },
    ]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleExerciseChange = (blockId: string, exerciseId: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, exerciseId } : b)));
    if (exerciseId) {
      exercisesApi.lastSets(parseInt(exerciseId)).then((sets) => {
        setLastSetsMap((prev) => ({ ...prev, [blockId]: sets }));
      }).catch(() => {});
    }
  };

  const updateBlock = (blockId: string, field: "exerciseId" | "memo", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b))
    );
  };

  const addSetToBlock = (blockId: string) => {
    const s = newSet();
    focusSetIdRef.current = s.id;
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, sets: [...b.sets, s] } : b))
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

  const openNoteModal = async (exerciseId: number, exerciseName: string) => {
    setNoteModal({ exerciseId, exerciseName, note: "", loading: true, saving: false });
    try {
      const data = await exerciseNotesApi.get(exerciseId);
      setNoteModal((prev) => prev && { ...prev, note: data.note ?? "", loading: false });
    } catch {
      setNoteModal((prev) => prev && { ...prev, loading: false });
    }
  };

  const saveNote = async () => {
    if (!noteModal) return;
    setNoteModal((prev) => prev && { ...prev, saving: true });
    try {
      await exerciseNotesApi.upsert(noteModal.exerciseId, noteModal.note);
      setNoteModal(null);
    } catch {
      setNoteModal((prev) => prev && { ...prev, saving: false });
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const workout = await workoutsApi.create({
        date,
        condition,
        memo: memo || undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        gym_type: gymType || undefined,
      });

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block.exerciseId) continue;

        const we = await workoutExercisesApi.create(workout.id, {
          exercise_id: parseInt(block.exerciseId),
          order: i + 1,
          memo: block.memo,
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

        {/* Time */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">時間（任意）</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">開始</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">終了</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Gym type */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">ジムタイプ（任意）</p>
          <div className="grid grid-cols-2 gap-2">
            {GYM_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGymType(gymType === opt.value ? "" : opt.value)}
                className={`py-2 rounded-xl border-2 text-sm transition-all ${
                  gymType === opt.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                    : "border-gray-100 bg-gray-50 text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workout memo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            ワークアウトメモ（任意）
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
        {blocks.map((block, blockIndex) => {
          const exercise = exercises.find((e) => e.id.toString() === block.exerciseId);
          const lastSets = lastSetsMap[block.id] ?? [];
          return (
            <div key={block.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Block header */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
                <span className="text-xs text-gray-400 font-medium w-5 text-center">
                  {blockIndex + 1}
                </span>
                <select
                  value={block.exerciseId}
                  onChange={(e) => handleExerciseChange(block.id, e.target.value)}
                  className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="" disabled>種目を選択</option>
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
                  onClick={() =>
                    exercise && openNoteModal(exercise.id, exercise.name)
                  }
                  title="種目メモを編集"
                  className="text-lg leading-none text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0"
                >
                  📝
                </button>
                <button
                  onClick={() => removeBlock(block.id)}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>

              {/* Previous sets hint */}
              {block.exerciseId && lastSets.length > 0 && (
                <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-400">
                    前回：{lastSets.map((s) =>
                      [s.weight ? `${s.weight}kg` : null, s.reps ? `${s.reps}回` : null]
                        .filter(Boolean).join("×")
                    ).join(" / ")}
                  </p>
                </div>
              )}

              <div className="px-4 py-3 space-y-3">
                {/* Exercise memo */}
                <input
                  type="text"
                  value={block.memo}
                  onChange={(e) => updateBlock(block.id, "memo", e.target.value)}
                  placeholder="このセッションのメモ（任意）"
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
                          ref={(el) => {
                            if (el && focusSetIdRef.current === s.id) {
                              el.focus();
                              focusSetIdRef.current = null;
                            }
                          }}
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
          );
        })}

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

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                📝 {noteModal.exerciseName}
              </h3>
              <button
                onClick={() => setNoteModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {noteModal.loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <textarea
                value={noteModal.note}
                onChange={(e) =>
                  setNoteModal((prev) => prev && { ...prev, note: e.target.value })
                }
                placeholder="この種目に関するメモ（フォームのコツ、重量の目標など）"
                rows={5}
                autoFocus
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveNote}
                disabled={noteModal.loading || noteModal.saving}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {noteModal.saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
