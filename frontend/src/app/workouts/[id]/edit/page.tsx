"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getTokens, exercisesApi, workoutsApi, exerciseNotesApi } from "@/lib/api";
import type { Exercise } from "@/lib/types";
import ConditionScale from "@/components/workout/ConditionScale";
import DatePickerSheet from "@/components/workout/DatePickerSheet";
import ReorderList from "@/components/workout/ReorderList";
import { generateSets, type ProposedSet } from "@/lib/workoutProposal";

const GYM_TYPE_OPTIONS = [
  { value: "anytime", label: "エニタイム" },
  { value: "personal", label: "パーソナル" },
  { value: "home", label: "自宅" },
  { value: "municipal", label: "区営ジム" },
];

const SIDE_OPTIONS = [
  { value: "", label: "両側" },
  { value: "左", label: "左" },
  { value: "右", label: "右" },
];

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

interface SetDraft {
  id: string;
  dbId?: number;
  weight: string;
  reps: string;
}

interface ExerciseBlock {
  id: string;
  dbId?: number;
  exerciseId: string;
  side: string;
  memo: string;
  sets: SetDraft[];
  originalSetIds: number[];
}

interface NoteModal {
  exerciseId: number;
  exerciseName: string;
  note: string;
  loading: boolean;
  saving: boolean;
}

function newSet(): SetDraft {
  return { id: crypto.randomUUID(), weight: "", reps: "" };
}

function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = "日月火水木金土"[d.getDay()];
  return `${month}月${day}日（${dow}）`;
}

export default function EditWorkoutPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const workoutId = Number(id);
  const isValidId = Number.isInteger(workoutId) && workoutId > 0;

  const [ready, setReady] = useState(false);

  // Guard against invalid workout ID
  useEffect(() => {
    if (!isValidId) {
      router.replace("/workouts");
    }
  }, [isValidId, router]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [date, setDate] = useState("");
  const [condition, setCondition] = useState<number>(3);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [gymType, setGymType] = useState("");
  const [memo, setMemo] = useState("");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [lastSetsMap, setLastSetsMap] = useState<Record<string, { weight: string | null; reps: number | null }[]>>({});
  const focusSetIdRef = useRef<string | null>(null);
  const focusBlockIdRef = useRef<string | null>(null);
  const [originalBlockIds, setOriginalBlockIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [proposalBlockId, setProposalBlockId] = useState<string | null>(null);
  const [ruleHintBlockId, setRuleHintBlockId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<NoteModal | null>(null);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!ready || !isValidId) return;
    Promise.all([exercisesApi.list(), workoutsApi.get(workoutId)])
      .then(([exs, workout]) => {
        setExercises(exs);
        setDate(workout.date);
        setCondition(workout.condition ?? 3);
        setStartTime(workout.start_time ?? "");
        setEndTime(workout.end_time ?? "");
        setGymType(workout.gym_type ?? "");
        setMemo(workout.memo ?? "");

        const sortedExercises = [...(workout.workout_exercises ?? [])].sort(
          (a, b) => a.order - b.order
        );
        const loadedBlocks: ExerciseBlock[] = sortedExercises.map((we) => {
          const sortedSets = [...(we.workout_sets ?? [])].sort(
            (a, b) => a.set_number - b.set_number
          );
          return {
            id: `db-${we.id}`,
            dbId: we.id,
            exerciseId: we.exercise_id.toString(),
            side: we.side ?? "",
            memo: we.memo ?? "",
            sets: sortedSets.map((ws) => ({
              id: `db-${ws.id}`,
              dbId: ws.id,
              weight: ws.weight ?? "",
              reps: ws.reps?.toString() ?? "",
            })),
            originalSetIds: sortedSets.map((ws) => ws.id),
          };
        });
        setBlocks(loadedBlocks);
        setOriginalBlockIds(loadedBlocks.map((b) => b.dbId!));

        // Fetch last sets for each block (for proposal feature)
        loadedBlocks.forEach((block) => {
          if (block.exerciseId) {
            exercisesApi.lastSets(parseInt(block.exerciseId), { side: block.side || undefined, excludeWorkoutId: workoutId }).then((sets) => {
              setLastSetsMap((prev) => ({ ...prev, [block.id]: sets }));
            }).catch(() => {});
          }
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, isValidId, workoutId]);

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const totalSets = blocks.reduce((a, b) => a + b.sets.length, 0);
  const totalVolume = blocks.reduce(
    (a, block) =>
      a + block.sets.reduce((b, s) => b + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0),
    0
  );

  const addBlock = () => {
    const id = crypto.randomUUID();
    focusBlockIdRef.current = id;
    setBlocks((prev) => [...prev, { id, exerciseId: "", side: "", memo: "", sets: [newSet()], originalSetIds: [] }]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleExerciseChange = (blockId: string, exerciseId: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, exerciseId } : b)));
    if (exerciseId) {
      const block = blocks.find((b) => b.id === blockId);
      exercisesApi.lastSets(parseInt(exerciseId), { side: block?.side || undefined, excludeWorkoutId: workoutId }).then((sets) => {
        setLastSetsMap((prev) => ({ ...prev, [blockId]: sets }));
      }).catch(() => {});
    }
  };

  const updateBlock = (blockId: string, field: "exerciseId" | "side" | "memo", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b))
    );
    if (field === "side") {
      const block = blocks.find((b) => b.id === blockId);
      if (block?.exerciseId) {
        exercisesApi.lastSets(parseInt(block.exerciseId), { side: value || undefined, excludeWorkoutId: workoutId }).then((sets) => {
          setLastSetsMap((prev) => ({ ...prev, [blockId]: sets }));
        }).catch(() => {});
      }
    }
  };

  const addSetToBlock = (blockId: string) => {
    const s = newSet();
    focusSetIdRef.current = s.id;
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, sets: [...b.sets, s] } : b))
    );
  };

  const updateSet = (blockId: string, setId: string, field: "weight" | "reps", value: string) => {
    if (value !== "" && (field === "weight" ? !/^\d*\.?\d*$/.test(value) : !/^\d*$/.test(value))) return;
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
    if (blocks.filter((b) => b.exerciseId).length === 0) {
      setError("種目を1つ以上追加してください");
      return;
    }
    setSaving(true);
    try {
      const currentBlockDbIds = blocks.filter((b) => b.exerciseId).map((b) => b.dbId).filter(Boolean) as number[];

      const destroyedBlocks = originalBlockIds
        .filter((dbId) => !currentBlockDbIds.includes(dbId))
        .map((dbId) => ({ id: dbId, _destroy: true }));

      const currentBlocks = blocks
        .filter((block) => block.exerciseId)
        .map((block, i) => {
          const currentSetDbIds = block.sets.map((s) => s.dbId).filter(Boolean) as number[];
          const destroyedSets = block.originalSetIds
            .filter((dbId) => !currentSetDbIds.includes(dbId))
            .map((dbId) => ({ id: dbId, _destroy: true }));

          const currentSets = block.sets.map((s, j) => {
            const w = s.weight ? parseFloat(s.weight) : null;
            const r = s.reps ? parseInt(s.reps) : null;
            return {
              ...(s.dbId ? { id: s.dbId } : {}),
              set_number: j + 1,
              weight: w !== null && Number.isFinite(w) ? w : null,
              reps: r !== null && Number.isFinite(r) ? r : null,
            };
          });

          return {
            ...(block.dbId ? { id: block.dbId } : {}),
            exercise_id: parseInt(block.exerciseId),
            order: i + 1,
            memo: block.memo || null,
            side: block.side || "",
            workout_sets_attributes: [...currentSets, ...destroyedSets],
          };
        });

      await workoutsApi.update(workoutId, {
        date,
        condition,
        memo: memo || null,
        start_time: startTime || null,
        end_time: endTime || null,
        gym_type: gymType || null,
        workout_exercises_attributes: [...currentBlocks, ...destroyedBlocks],
      });

      sessionStorage.setItem("flash", "保存しました");
      router.push("/workouts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top app bar */}
      <div className="sticky top-0 z-50 bg-[#FAFAFA] flex items-center justify-between px-1 py-2">
        <button
          onClick={() => router.back()}
          disabled={saving}
          className="w-11 h-11 rounded-full flex items-center justify-center text-gray-900 disabled:opacity-40"
          aria-label="戻る"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 4.5L7.5 11l6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white mr-2
            bg-[#5b5bf2] shadow-[0_8px_20px_#5b5bf255,0_1px_2px_#5b5bf233] disabled:opacity-80 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{saving ? "保存中…" : "保存"}</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-2 px-3 py-2 bg-red-50 text-red-500 text-sm rounded-lg">{error}</div>
      )}

      {/* Content */}
      <div className="px-5 pb-8">
        {/* Header: TRAINING LOG + Date */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] mb-1">
            TRAINING LOG
          </div>
          <button
            onClick={() => setDateOpen(true)}
            className="inline-flex items-center bg-transparent border-none p-0 cursor-pointer"
          >
            <span className="text-[28px] font-bold tracking-tight text-gray-900">
              {date ? formatDateJP(date) : ""}
            </span>
            <svg className="ml-2 text-gray-400 mt-1" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Summary Chips */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">種目</div>
            <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">
              {blocks.filter((b) => b.exerciseId).length}
            </div>
          </div>
          <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">セット</div>
            <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">{totalSets}</div>
          </div>
          <div className="flex-[2] bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">総ボリューム</div>
            <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">
              {totalVolume.toLocaleString()} kg
            </div>
          </div>
        </div>

        {/* SESSION section header */}
        <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] mb-2">SESSION</div>

        {/* Session Info Card */}
        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.03)] overflow-hidden mb-5">
          {/* Condition row */}
          <div className="px-4 py-4">
            <div className="text-[11px] font-semibold text-gray-400 tracking-[0.08em] mb-4">
              コンディション
            </div>
            <ConditionScale value={condition} onChange={setCondition} />
          </div>

          <div className="h-px bg-black/[0.08]" />

          {/* Time row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-14 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">時間</span>
              <span className="ml-1 text-[10px] font-medium text-gray-400">任意</span>
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="開始"
                className="flex-1 min-w-0 px-2.5 py-1.5 border border-black/[0.08] rounded-lg text-sm font-mono text-gray-900
                  focus:outline-none focus:border-[#5b5bf2] focus:ring-2 focus:ring-[#5b5bf2]/10"
              />
              <span className="text-gray-400 text-sm flex-shrink-0">→</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="終了"
                className="flex-1 min-w-0 px-2.5 py-1.5 border border-black/[0.08] rounded-lg text-sm font-mono text-gray-900
                  focus:outline-none focus:border-[#5b5bf2] focus:ring-2 focus:ring-[#5b5bf2]/10"
              />
            </div>
          </div>

          <div className="h-px bg-black/[0.08]" />

          {/* Gym row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-14 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">ジム</span>
              <span className="ml-1 text-[10px] font-medium text-gray-400">任意</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {GYM_TYPE_OPTIONS.map((opt) => {
                const active = gymType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGymType(active ? "" : opt.value)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                      active
                        ? "border border-[#5b5bf2] bg-[#5b5bf2]/[0.07] text-[#5b5bf2]"
                        : "border border-black/[0.08] bg-white text-gray-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-black/[0.08]" />

          {/* Memo row */}
          <div className="flex gap-3 px-4 py-3">
            <div className="w-14 flex-shrink-0 pt-0.5">
              <span className="text-xs font-semibold text-gray-500">メモ</span>
              <span className="ml-1 text-[10px] font-medium text-gray-400">任意</span>
            </div>
            <textarea
              ref={(el) => {
                if (el && memo) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder="今日の感想など…"
              rows={3}
              className="flex-1 resize-none border-none outline-none bg-transparent text-sm text-gray-900 leading-relaxed placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* EXERCISES section header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em]">EXERCISES</div>
          {blocks.length > 1 && (
            <button
              onClick={() => setReorderMode(!reorderMode)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all
                bg-transparent border border-black/[0.08] text-gray-500"
            >
              {reorderMode ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>並べ替え完了</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4h7M3 8h10M3 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M11.5 11l2 2 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>並び替え</span>
                </>
              )}
            </button>
          )}
        </div>

        {reorderMode ? (
          <>
            <div className="flex items-center gap-1.5 px-1 pb-2 text-xs text-gray-500">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                <path d="M4 5h10M4 9h10M4 13h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              <span>ハンドルをドラッグして順序を変更</span>
            </div>
            <ReorderList
              items={blocks.map((b) => ({
                id: b.id,
                name: exercises.find((e) => e.id.toString() === b.exerciseId)?.name || "",
                side: b.side,
                setsCount: b.sets.length,
              }))}
              onReorder={(reordered) => {
                const idOrder = reordered.map((r) => r.id);
                setBlocks((prev) => {
                  const map = new Map(prev.map((b) => [b.id, b]));
                  return idOrder.map((id) => map.get(id)!);
                });
              }}
            />
          </>
        ) : (
          <>
            {/* Exercise cards */}
            <div className="space-y-3">
              {blocks.map((block) => {
                const exercise = exercises.find((e) => e.id.toString() === block.exerciseId);
                const lastSets = lastSetsMap[block.id] ?? [];
                return (
                  <div
                    key={block.id}
                    className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.03)] p-4"
                    ref={(el) => {
                      if (el && focusBlockIdRef.current === block.id) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                        focusBlockIdRef.current = null;
                      }
                    }}
                  >
                    {/* Header: exercise selector + note + delete */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <div className="flex items-center justify-between py-1 px-1 pointer-events-none">
                          <span className={`text-[17px] font-semibold tracking-tight ${
                            exercise ? "text-gray-900" : "text-gray-400"
                          }`}>
                            {exercise?.name || "種目を選択"}
                          </span>
                          <svg className="text-gray-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <select
                          value={block.exerciseId}
                          onChange={(e) => handleExerciseChange(block.id, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        >
                          <option value="" disabled>種目を選択</option>
                          {Object.entries(grouped).map(([cat, exs]) => (
                            <optgroup key={cat} label={CATEGORY_JP[cat] ?? cat}>
                              {exs.map((ex) => (
                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {exercise && (
                        <button
                          onClick={() => openNoteModal(exercise.id, exercise.name)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#5b5bf2] transition-colors flex-shrink-0"
                          title="種目メモ"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                            <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => removeBlock(block.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label="種目を削除"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* Meta row: side segment + proposal button */}
                    <div className="flex items-center gap-2 mt-2 mb-3">
                      <div className="inline-flex p-[3px] bg-[#F3F3F6] rounded-[9px] gap-0.5">
                        {SIDE_OPTIONS.map((opt) => {
                          const active = block.side === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updateBlock(block.id, "side", opt.value)}
                              className={`px-3.5 py-1 rounded-md text-xs min-w-[44px] transition-all ${
                                active
                                  ? "bg-white text-gray-900 font-bold shadow-[0_1px_2px_rgba(15,18,40,0.08)]"
                                  : "text-gray-500 font-medium"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1" />
                      {block.exerciseId && (
                        <button
                          onClick={() => setProposalBlockId(block.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold
                            bg-[#5b5bf2]/[0.08] border border-[#5b5bf2]/20 text-[#5b5bf2]"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1l1.2 3.3L10.5 5.5 7.2 6.7 6 10l-1.2-3.3L1.5 5.5l3.3-1.2L6 1z" fill="currentColor"/>
                          </svg>
                          セット提案
                        </button>
                      )}
                    </div>

                    {/* Previous sets (chip style, tappable for rule hint) */}
                    {block.exerciseId && lastSets.length > 0 && (
                      <div className="relative mb-3">
                        <button
                          onClick={() => setRuleHintBlockId(ruleHintBlockId === block.id ? null : block.id)}
                          className={`w-full px-2.5 py-2 rounded-[10px] flex items-center gap-2 flex-wrap text-left transition-all ${
                            ruleHintBlockId === block.id
                              ? "bg-[#5b5bf2]/[0.06] border border-[#5b5bf2]/20"
                              : "bg-[#F3F3F6] border border-transparent"
                          }`}
                        >
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.08em] flex-shrink-0 ${
                            ruleHintBlockId === block.id ? "text-[#5b5bf2]" : "text-gray-500"
                          }`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6a4 4 0 1 0 1.2-2.8M2 2v2h2" stroke={ruleHintBlockId === block.id ? "#5b5bf2" : "rgb(156,163,175)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            前回
                          </span>
                          <span className="flex gap-2 flex-wrap font-mono text-xs">
                            {lastSets.map((s, i) => (
                              <span key={i} className="whitespace-nowrap">
                                {s.weight && <><span className="font-bold text-gray-900">{s.weight}</span><span className="text-gray-400 mx-px">×</span></>}
                                {s.reps && <span className="font-medium text-gray-500">{s.reps}</span>}
                              </span>
                            ))}
                          </span>
                        </button>
                        {ruleHintBlockId === block.id && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-black/[0.08]
                            shadow-[0_4px_12px_rgba(15,18,40,0.1)] px-3.5 py-2.5">
                            <div className="flex items-center gap-1 mb-2">
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-gray-400">
                                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                                <path d="M5.5 4v2.5M5.5 7.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                              </svg>
                              <span className="text-[10px] font-bold text-gray-500 tracking-[0.08em]">重量調整ルール</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-baseline gap-2">
                                <span className="w-4 font-mono text-sm font-bold text-center" style={{ color: "oklch(0.42 0.12 145)" }}>↑</span>
                                <span className="flex-1 text-[12.5px] font-medium text-gray-500">全セット 10回達成</span>
                                <span className="font-mono font-bold text-[12.5px]" style={{ color: "oklch(0.42 0.12 145)", letterSpacing: "-0.01em" }}>+2.5 kg</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="w-4 font-mono text-sm font-bold text-center" style={{ color: "oklch(0.5 0.14 25)" }}>↓</span>
                                <span className="flex-1 text-[12.5px] font-medium text-gray-500">全セット 7回以下</span>
                                <span className="font-mono font-bold text-[12.5px]" style={{ color: "oklch(0.5 0.14 25)", letterSpacing: "-0.01em" }}>-2.5 kg</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="w-4 font-mono text-sm font-bold text-center text-gray-500">→</span>
                                <span className="flex-1 text-[12.5px] font-medium text-gray-500">それ以外</span>
                                <span className="font-mono font-bold text-[12.5px] text-gray-500" style={{ letterSpacing: "-0.01em" }}>維持</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Exercise memo */}
                    <div className="flex items-center gap-2 mb-3.5 px-3 py-2.5 bg-[#F3F3F6] rounded-[10px]">
                      <span className="text-gray-400 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <input
                        value={block.memo}
                        onChange={(e) => updateBlock(block.id, "memo", e.target.value)}
                        placeholder="このセッションのメモ（任意）"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 min-w-0"
                      />
                    </div>

                    {/* Set rows */}
                    <div className="flex flex-col gap-2">
                      {block.sets.map((s, setIndex) => {
                        const filled = s.weight !== "" || s.reps !== "";
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center
                                text-xs font-semibold font-mono transition-all ${
                                filled
                                  ? "bg-[#5b5bf2] text-white"
                                  : "bg-[#F3F3F6] text-gray-400"
                              }`}
                            >
                              {setIndex + 1}
                            </div>
                            <div className="flex-1 flex items-center h-11 px-3 border border-black/[0.08] rounded-[10px] bg-white
                              focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={s.weight}
                                onChange={(e) => updateSet(block.id, s.id, "weight", e.target.value)}
                                placeholder="重量"
                                className="flex-1 border-none outline-none bg-transparent font-mono text-[17px] font-medium
                                  text-gray-900 tracking-tight w-full placeholder:text-gray-400"
                                ref={(el) => {
                                  if (el && focusSetIdRef.current === s.id) {
                                    el.focus();
                                    focusSetIdRef.current = null;
                                  }
                                }}
                              />
                              <span className="text-xs font-medium text-gray-500 ml-1 tracking-wide">kg</span>
                            </div>
                            <div className="flex-1 flex items-center h-11 px-3 border border-black/[0.08] rounded-[10px] bg-white
                              focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={s.reps}
                                onChange={(e) => updateSet(block.id, s.id, "reps", e.target.value)}
                                placeholder="回数"
                                className="flex-1 border-none outline-none bg-transparent font-mono text-[17px] font-medium
                                  text-gray-900 tracking-tight w-full placeholder:text-gray-400"
                              />
                              <span className="text-xs font-medium text-gray-500 ml-1 tracking-wide">回</span>
                            </div>
                            <button
                              onClick={() => removeSet(block.id, s.id)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                              aria-label="セットを削除"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => addSetToBlock(block.id)}
                      className="flex items-center justify-center gap-1.5 w-full mt-2.5 py-2.5 px-3 text-[#5b5bf2]
                        text-sm font-semibold rounded-[10px] transition-colors hover:bg-[#5b5bf2]/5"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                      </svg>
                      <span>セットを追加</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add exercise button */}
            <button
              onClick={addBlock}
              disabled={exercises.length === 0}
              className="flex items-center justify-center gap-2 w-full mt-3 py-4 bg-white border border-black/[0.08]
                rounded-[14px] text-[15px] font-semibold text-gray-500 hover:text-[#5b5bf2] hover:border-[#5b5bf2]/30
                transition-colors disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              <span>種目を追加</span>
            </button>
          </>
        )}
      </div>

      {/* Date picker sheet */}
      <DatePickerSheet
        open={dateOpen}
        value={date}
        onChange={setDate}
        onClose={() => setDateOpen(false)}
      />

      {/* Proposal sheet */}
      {proposalBlockId && (
        <ProposalSheet
          lastSets={proposalBlockId ? (lastSetsMap[proposalBlockId] ?? []) : []}
          onClose={() => setProposalBlockId(null)}
          onApply={(proposedSets) => {
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === proposalBlockId
                  ? {
                      ...b,
                      sets: proposedSets.map((ps) => ({
                        id: crypto.randomUUID(),
                        weight: ps.weight.toString(),
                        reps: ps.reps.toString(),
                      })),
                    }
                  : b
              )
            );
            setProposalBlockId(null);
          }}
        />
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{noteModal.exerciseName}</h3>
              <button
                onClick={() => setNoteModal(null)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {noteModal.loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
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
                className="w-full px-3 py-2 border border-black/[0.08] rounded-xl text-sm resize-none
                  focus:outline-none focus:ring-2 focus:ring-[#5b5bf2]/20 focus:border-[#5b5bf2]"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-3 border border-black/[0.08] rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveNote}
                disabled={noteModal.loading || noteModal.saving}
                className="flex-1 py-3 bg-[#5b5bf2] text-white rounded-xl text-sm font-medium
                  hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {noteModal.saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proposal Sheet (Bottom Sheet) ──
function ProposalSheet({
  lastSets,
  onClose,
  onApply,
}: {
  lastSets: { weight: string | null; reps: number | null }[];
  onClose: () => void;
  onApply: (sets: { weight: number; reps: number }[]) => void;
}) {
  const [weightInput, setWeightInput] = useState("");
  const [sets, setSets] = useState<ProposedSet[] | null>(null);

  const prevMaxWeight = lastSets.reduce((max, s) => {
    const w = s.weight !== null ? Number(s.weight) : 0;
    return w > max ? w : max;
  }, 0);

  const weight = Number(weightInput);
  const isValid = weightInput !== "" && Number.isFinite(weight) && weight > 0;

  const handleCalculate = () => {
    if (!isValid) return;
    setSets(generateSets(weight));
  };

  const handleApply = () => {
    if (!sets) return;
    onApply(sets.map((s) => ({ weight: s.weight, reps: s.reps })));
  };

  const totalWeight = sets?.reduce((a, s) => a + s.weight * s.reps, 0) ?? 0;
  const totalReps = sets?.reduce((a, s) => a + s.reps, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92%", animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(91,91,242,0.1)" }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M6 1l1.2 3.3L10.5 5.5 7.2 6.7 6 10l-1.2-3.3L1.5 5.5l3.3-1.2L6 1z" fill="#5b5bf2"/>
              </svg>
            </span>
            <span className="text-[16px] font-bold text-gray-900 tracking-tight">セット提案</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Weight input */}
        <div className={`px-4 ${sets ? "pb-3" : "pb-8"}`}>
          <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1.5">ワーキング重量</div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center h-[46px] px-3.5 border border-black/[0.08] rounded-[11px] bg-white
              focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) {
                    setWeightInput(v);
                  }
                }}
                placeholder={prevMaxWeight > 0 ? `前回最大: ${prevMaxWeight}` : "例: 49"}
                autoFocus
                className="flex-1 border-none outline-none bg-transparent font-mono text-[18px] font-bold
                  text-gray-900 tracking-tight w-full placeholder:text-gray-400 placeholder:font-medium placeholder:text-sm"
              />
              <span className="text-xs font-medium text-gray-400 ml-1">kg</span>
            </div>
            <button
              onClick={handleCalculate}
              disabled={!isValid}
              className="px-[18px] h-[46px] rounded-[11px] text-white text-[13px] font-bold tracking-tight
                disabled:opacity-40 transition-all"
              style={{ background: "#5b5bf2", boxShadow: "0 2px 8px rgba(91,91,242,0.22)" }}
            >
              計算
            </button>
          </div>
        </div>

        {/* Generated sets */}
        {sets && (
          <>
            <div className="flex-1 overflow-y-auto px-4 pt-1 pb-1">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em]">5セット構成</div>
                <div className="font-mono text-[10px] font-medium text-gray-400">
                  total {totalWeight.toLocaleString()}kg / {totalReps}回
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {sets.map((s, i) => {
                  const isWarmup = s.type === "warmup";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px]"
                      style={{
                        background: isWarmup ? "oklch(0.97 0.02 60)" : "#F3F3F6",
                        border: isWarmup ? "1px solid oklch(0.93 0.03 60)" : "1px solid transparent",
                      }}
                    >
                      <span
                        className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center font-mono text-xs font-bold text-white"
                        style={{ background: isWarmup ? "oklch(0.85 0.08 60)" : "#5b5bf2" }}
                      >
                        {i + 1}
                      </span>
                      <span className="flex items-baseline gap-1 flex-1 font-mono tracking-tight">
                        <span className="text-[18px] font-bold text-gray-900">{s.weight}</span>
                        <span className="text-[11px] text-gray-400">kg</span>
                        <span className="text-sm text-gray-400 mx-1">×</span>
                        <span className="text-[18px] font-bold text-gray-900">{s.reps}</span>
                        <span className="text-[11px] text-gray-400">回</span>
                      </span>
                      {isWarmup && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white tracking-wide"
                          style={{ background: "oklch(0.85 0.1 60)" }}
                        >
                          W-UP
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-4 pt-3 pb-6 border-t border-black/[0.08] bg-white">
              <button
                onClick={handleApply}
                className="w-full h-[50px] rounded-xl text-white text-sm font-bold tracking-tight"
                style={{
                  background: "#5b5bf2",
                  boxShadow: "0 4px 12px rgba(91,91,242,0.3), 0 1px 2px rgba(91,91,242,0.15)",
                }}
              >
                適用
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
