"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AiAdviceModal from "@/components/AiAdviceModal";
import { getTokens, workoutsApi } from "@/lib/api";
import type { Workout } from "@/lib/types";

// ── Condition palette (oklch) ──
const CONDITION_MAP: Record<number, { label: string; hue: number; chroma: number }> = {
  1: { label: "最悪", hue: 25, chroma: 0.10 },
  2: { label: "悪い", hue: 60, chroma: 0.08 },
  3: { label: "普通", hue: 270, chroma: 0.01 },
  4: { label: "良い", hue: 145, chroma: 0.10 },
  5: { label: "最高", hue: 200, chroma: 0.12 },
};

// ── Gym palette ──
const GYM_LABELS: Record<string, string> = {
  anytime: "エニタイム",
  personal: "パーソナル",
  home: "自宅",
  municipal: "区営ジム",
};
const GYM_HUE: Record<string, number> = {
  anytime: 245,
  personal: 290,
  home: 145,
  municipal: 30,
};

const SORT_LABELS: Record<string, string> = {
  newest: "新しい順",
  oldest: "古い順",
  volume: "ボリューム順",
  duration: "時間順",
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const ACCENT = "#5b5bf2";

function calcVolume(w: Workout): number {
  return (w.workout_exercises ?? []).reduce(
    (a, we) =>
      a + (we.workout_sets ?? []).reduce(
        (b, ws) => b + (Number(ws.weight) || 0) * (Number(ws.reps) || 0),
        0
      ),
    0
  );
}

function calcSets(w: Workout): number {
  return (w.workout_exercises ?? []).reduce((a, we) => a + (we.workout_sets ?? []).length, 0);
}

function calcDuration(w: Workout): number {
  if (!w.start_time || !w.end_time) return 0;
  const [sh, sm] = w.start_time.split(":").map(Number);
  const [eh, em] = w.end_time.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthOpen, setMonthOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [activeAdviceWorkout, setActiveAdviceWorkout] = useState<Workout | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
      const msg = sessionStorage.getItem("flash");
      if (msg) {
        sessionStorage.removeItem("flash");
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    workoutsApi
      .list()
      .then((data) => {
        setWorkouts(data);
        if (data.length > 0) setSelectedMonth(data[0].date.slice(0, 7));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready]);

  const months = useMemo(() => {
    const set = new Set(workouts.map((w) => w.date.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [workouts]);

  const filtered = useMemo(() => {
    const list = workouts.filter((w) => w.date.slice(0, 7) === selectedMonth);
    const sorters: Record<string, (a: Workout, b: Workout) => number> = {
      newest: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      volume: (a, b) => calcVolume(b) - calcVolume(a),
      duration: (a, b) => calcDuration(b) - calcDuration(a),
    };
    return [...list].sort(sorters[sortBy] ?? sorters.newest);
  }, [workouts, selectedMonth, sortBy]);

  const totalSets = filtered.reduce((a, w) => a + calcSets(w), 0);
  const totalVolume = filtered.reduce((a, w) => a + calcVolume(w), 0);

  const [mY, mM] = selectedMonth.split("-").map(Number);
  const monthLabel = selectedMonth ? `${mY}年 ${mM}月` : "";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await workoutsApi.delete(deleteTarget.id);
    setWorkouts((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    setDeleteTarget(null);
    setToast("削除しました");
    setTimeout(() => setToast(null), 3000);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm text-white bg-green-500">
          {toast}
        </div>
      )}

      {/* Top app bar */}
      <div className="sticky top-0 z-50 bg-[#FAFAFA] flex items-center justify-between px-5 h-[60px]">
        <span className="text-xl font-bold text-gray-900 tracking-tight">ワークアウト</span>
      </div>

      <div className="bg-[#FAFAFA]">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* TRAINING LOG + Month header */}
            <div className="px-5 pt-2 pb-4">
              <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] mb-1">
                TRAINING LOG
              </div>
              <button
                onClick={() => setMonthOpen(true)}
                className="inline-flex items-center bg-transparent border-none p-0 cursor-pointer mb-4"
              >
                <span className="text-[28px] font-bold tracking-tight text-gray-900 whitespace-nowrap">
                  {monthLabel}
                </span>
                <svg className="ml-2 text-gray-400 mt-1" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Summary chips */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">記録</div>
                  <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">{filtered.length}回</div>
                </div>
                <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">セット</div>
                  <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">{totalSets}</div>
                </div>
                <div className="flex-[2] bg-white rounded-[10px] border border-black/[0.08] px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-0.5">総ボリューム</div>
                  <div className="text-[17px] font-bold text-gray-900 font-mono tracking-tight">{totalVolume.toLocaleString()} kg</div>
                </div>
              </div>
            </div>

            {/* SESSIONS header + sort */}
            <div className="flex items-center justify-between px-5 py-2 relative">
              <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em]">SESSIONS</div>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sortOpen ? "bg-[#F3F3F6] text-gray-500" : "bg-transparent text-gray-500"
                }`}
              >
                <span>{SORT_LABELS[sortBy]}</span>
                <svg className="text-gray-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Sort dropdown */}
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setSortOpen(false)} />
                  <div className="absolute top-9 right-4 z-[61] bg-white rounded-xl border border-black/[0.08]
                    shadow-[0_12px_32px_rgba(15,18,40,0.12),0_2px_6px_rgba(15,18,40,0.06)] p-1 min-w-[180px]">
                    {Object.entries(SORT_LABELS).map(([key, label]) => {
                      const active = sortBy === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { setSortBy(key); setSortOpen(false); }}
                          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left text-sm"
                          style={{
                            color: active ? ACCENT : undefined,
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          <span>{label}</span>
                          {active && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7.5l2.5 2.5L11 4" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Cards or empty state */}
            <div className="px-4 pb-4">
              {filtered.length === 0 ? (
                <div className="py-12 px-5 text-center bg-white rounded-2xl border border-dashed border-black/[0.08]">
                  <div className="text-[32px] mb-3 opacity-40">💪</div>
                  <div className="text-[15px] font-bold text-gray-900 mb-1">{monthLabel}の記録はまだありません</div>
                  <div className="text-xs text-gray-500">下のボタンから記録を開始しましょう</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map((w) => (
                    <WorkoutCard
                      key={w.id}
                      workout={w}
                      onOpen={() => router.push(`/workouts/${w.id}/edit`)}
                      onAdvice={() => setActiveAdviceWorkout(w)}
                      onDelete={() => setDeleteTarget(w)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/workouts/new"
        className="fixed bottom-20 right-5 w-[60px] h-[60px] rounded-[20px] bg-[#5b5bf2] text-white
          flex items-center justify-center z-10
          shadow-[0_12px_28px_#5b5bf255,0_4px_8px_#5b5bf233,0_1px_2px_rgba(15,18,40,0.12)]
          active:scale-95 transition-transform"
        aria-label="新しいワークアウトを記録"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </Link>

      {/* Month picker sheet */}
      {monthOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end"
          style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setMonthOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-[20px] px-5 pt-6 pb-8 max-h-[70%] overflow-auto"
            style={{ animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] mb-3">月を選択</div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((mo) => {
                const [y, m] = mo.split("-").map(Number);
                const active = mo === selectedMonth;
                return (
                  <button
                    key={mo}
                    onClick={() => { setSelectedMonth(mo); setMonthOpen(false); }}
                    className={`py-3 px-2 rounded-xl font-mono text-sm transition-all ${
                      active
                        ? "border border-[#5b5bf2] bg-[#5b5bf2]/10 text-[#5b5bf2] font-bold"
                        : "border border-black/[0.08] bg-white text-gray-900 font-medium"
                    }`}
                  >
                    {y}.{String(m).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation sheet */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-end"
          style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white w-full rounded-t-[20px] px-5 pt-6 pb-8 text-center"
            style={{ animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[17px] font-bold text-gray-900 mb-1.5">
              このワークアウトを削除しますか？
            </div>
            <div className="text-[13px] text-gray-500 mb-5">
              この操作は取り消せません
            </div>
            <button
              onClick={handleDelete}
              className="w-full h-12 rounded-xl text-white font-bold text-[15px] mb-2"
              style={{ background: "oklch(0.55 0.18 25)" }}
            >
              削除する
            </button>
            <button
              onClick={() => setDeleteTarget(null)}
              className="w-full h-12 rounded-xl bg-[#F3F3F6] text-gray-900 font-semibold text-[15px]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* AI Advice Modal */}
      {activeAdviceWorkout && (
        <AiAdviceModal
          workout={activeAdviceWorkout}
          onClose={() => setActiveAdviceWorkout(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

// ── Workout Card ──
function WorkoutCard({
  workout: w,
  onOpen,
  onAdvice,
  onDelete,
}: {
  workout: Workout;
  onOpen: () => void;
  onAdvice: () => void;
  onDelete: () => void;
}) {
  const [memoExpanded, setMemoExpanded] = useState(false);

  const d = new Date(w.date + "T00:00:00");
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  const dow = DOW[d.getDay()];
  const dowColor = d.getDay() === 0 ? "oklch(0.6 0.15 25)" : d.getDay() === 6 ? "oklch(0.6 0.15 245)" : undefined;

  const timeStr = w.start_time
    ? w.end_time
      ? `${w.start_time.slice(0, 5)}–${w.end_time.slice(0, 5)}`
      : `${w.start_time.slice(0, 5)}〜`
    : null;
  const duration = calcDuration(w);
  const durationStr = duration > 0
    ? duration >= 60
      ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? `${duration % 60}m` : ""}`
      : `${duration}m`
    : null;

  const cond = w.condition ? CONDITION_MAP[w.condition] : null;
  const gymLabel = w.gym_type ? GYM_LABELS[w.gym_type] : null;
  const gymHue = w.gym_type ? GYM_HUE[w.gym_type] : null;

  const exercises = [...(w.workout_exercises ?? [])].sort((a, b) => a.order - b.order);
  const totalSets = exercises.reduce((a, we) => a + (we.workout_sets ?? []).length, 0);
  const totalVolume = calcVolume(w);

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] overflow-hidden cursor-pointer"
    >
      {/* Header: date + condition + AI + delete */}
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2.5">
        {/* Date block */}
        <div className="flex flex-col items-start flex-shrink-0">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[19px] font-bold font-mono tracking-tight text-gray-900">{dateStr}</span>
            <span
              className="text-[13px] font-bold tracking-wide"
              style={{ color: dowColor, fontFamily: "'Noto Sans JP', sans-serif" }}
            >({dow})</span>
          </div>
          {timeStr && (
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[11px] font-medium font-mono text-gray-400 tracking-tight">
                {timeStr}
              </span>
              {durationStr && (
                <span className="text-[10px] font-semibold font-mono text-gray-400">
                  ({durationStr})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Condition pill */}
        {cond && (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0 mt-0.5"
            style={{
              background: `oklch(0.96 ${cond.chroma * 0.4} ${cond.hue})`,
              color: `oklch(0.42 ${cond.chroma * 1.4} ${cond.hue})`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: `oklch(0.6 ${cond.chroma * 1.5} ${cond.hue})` }}
            />
            {cond.label}
          </span>
        )}

        {/* AI pill */}
        <button
          onClick={(e) => { e.stopPropagation(); onAdvice(); }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0 mt-0.5 border cursor-pointer"
          style={{
            background: `${ACCENT}10`,
            borderColor: `${ACCENT}33`,
            color: ACCENT,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1l1.2 3.3L10.5 5.5 7.2 6.7 6 10l-1.2-3.3L1.5 5.5l3.3-1.2L6 1z" fill={ACCENT}/>
          </svg>
          AI
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5"
          aria-label="削除"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Gym + summary */}
      <div className="flex items-center gap-2 px-3.5 pb-3 flex-wrap">
        {gymLabel && gymHue !== null && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
            style={{
              background: `oklch(0.96 0.02 ${gymHue})`,
              color: `oklch(0.4 0.08 ${gymHue})`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5a3 3 0 0 1 3 3c0 2.2-3 6-3 6s-3-3.8-3-6a3 3 0 0 1 3-3z" stroke={`oklch(0.5 0.1 ${gymHue})`} strokeWidth="1.3"/>
              <circle cx="6" cy="4.5" r="1" fill={`oklch(0.5 0.1 ${gymHue})`}/>
            </svg>
            {gymLabel}
          </span>
        )}
        <span className="text-[11px] font-medium font-mono text-gray-400 tracking-wide">
          {exercises.length}種目 · {totalSets}セット
          {totalVolume > 0 && <> · {totalVolume.toLocaleString()}kg</>}
        </span>
      </div>

      {/* Exercise list (V3 two-row) */}
      {exercises.length > 0 && (
        <div className="border-t border-black/[0.08] px-3.5 py-1.5">
          {exercises.map((we, i) => {
            const sets = [...(we.workout_sets ?? [])].sort((a, b) => a.set_number - b.set_number);
            return (
              <div
                key={we.id}
                className="py-2.5"
                style={{ borderTop: i > 0 ? "1px dashed rgba(15,18,40,0.05)" : "none" }}
              >
                {/* Row 1: exercise name + side chip */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[13px] font-bold text-gray-900 tracking-tight">
                    {we.exercise?.name ?? "不明"}
                  </span>
                  {we.side && we.side !== "both" && we.side !== "" && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-px rounded"
                      style={{
                        color: we.side === "左" ? "oklch(0.5 0.1 245)" : "oklch(0.5 0.1 25)",
                        background: we.side === "左" ? "oklch(0.96 0.02 245)" : "oklch(0.96 0.02 25)",
                      }}
                    >
                      {we.side === "左" ? "左" : "右"}
                    </span>
                  )}
                </div>
                {/* Row 2: sets */}
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[13px] leading-snug">
                  {sets.map((ws, k) => {
                    if (ws.weight && ws.reps) {
                      return (
                        <span key={k} className="whitespace-nowrap">
                          <span className="font-bold text-gray-900">{ws.weight}</span>
                          <span className="text-gray-400 font-medium mx-px">×</span>
                          <span className="text-gray-500">{ws.reps}</span>
                        </span>
                      );
                    }
                    if (ws.reps) {
                      return (
                        <span key={k} className="whitespace-nowrap">
                          <span className="text-gray-400 text-[10px]">×</span>
                          <span className="font-bold text-gray-900">{ws.reps}</span>
                        </span>
                      );
                    }
                    if (ws.weight) {
                      return (
                        <span key={k} className="whitespace-nowrap font-bold text-gray-900">{ws.weight}kg</span>
                      );
                    }
                    return <span key={k} className="text-gray-400">—</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Memo */}
      {w.memo && (
        <div className="border-t border-black/[0.08] px-3.5 py-2.5 pb-3">
          <div
            className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap"
            style={
              !memoExpanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {w.memo}
          </div>
          {w.memo.length > 60 && (
            <button
              onClick={(e) => { e.stopPropagation(); setMemoExpanded(!memoExpanded); }}
              className="mt-1 text-[11px] font-semibold tracking-wide border-none bg-transparent cursor-pointer p-0"
              style={{ color: ACCENT }}
            >
              {memoExpanded ? "折りたたむ" : "続きを読む"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
