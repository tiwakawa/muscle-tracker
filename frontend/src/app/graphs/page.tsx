"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getTokens, workoutsApi, exercisesApi } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import type { Exercise, Workout } from "@/lib/types";

const ACCENT = "#5b5bf2";

const CATEGORY_JP: Record<string, string> = {
  chest: "胸", back: "背中", shoulders: "肩", arms: "腕",
  legs: "脚", core: "腹・体幹", cardio: "有酸素", other: "その他",
};

const METRICS = [
  { key: "max_weight", label: "最大重量" },
  { key: "volume", label: "総ボリューム" },
  { key: "max_reps", label: "最大回数" },
];

const PERIODS = [
  { key: "1M", label: "1M", months: 1 },
  { key: "3M", label: "3M", months: 3 },
  { key: "6M", label: "6M", months: 6 },
  { key: "1Y", label: "1Y", months: 12 },
  { key: "all", label: "ALL", months: 0 },
];

// Dynamic import for recharts (SSR disabled)
const GraphChart = dynamic(() => import("@/components/GraphChart"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
    </div>
  ),
});

interface DataPoint {
  date: string;  // YYYY-MM-DD
  label: string; // M/D
  value: number;
}

interface ExerciseOption {
  key: string;       // "exerciseId|side"
  exerciseId: number;
  name: string;
  side: string;
  label: string;
  category: string;
  isBodyweight: boolean;
}

function buildOptions(workouts: Workout[], exercises: Exercise[]): ExerciseOption[] {
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const seen = new Map<string, { exerciseId: number; name: string; side: string; category: string; hasWeight: boolean }>();

  for (const w of workouts) {
    for (const we of w.workout_exercises ?? []) {
      const ex = exMap.get(we.exercise_id);
      if (!ex) continue;
      const side = we.side || "";
      const key = `${we.exercise_id}|${side}`;
      const existing = seen.get(key);
      const hasWeight = (we.workout_sets ?? []).some((s) => Number(s.weight) > 0);
      if (existing) {
        if (hasWeight) existing.hasWeight = true;
      } else {
        seen.set(key, { exerciseId: we.exercise_id, name: ex.name, side, category: ex.category, hasWeight });
      }
    }
  }

  // Check if an exercise has multiple sides
  const nameToSides = new Map<string, Set<string>>();
  seen.forEach((v) => {
    const s = nameToSides.get(v.name) ?? new Set();
    s.add(v.side);
    nameToSides.set(v.name, s);
  });

  const options: ExerciseOption[] = [];
  seen.forEach((v, key) => {
    const sides = nameToSides.get(v.name)!;
    const hasMixed = sides.size > 1;
    let label = v.name;
    if (hasMixed) {
      if (v.side === "" || v.side === "both") label = `${v.name}（両）`;
      else if (v.side === "左") label = `${v.name}（左）`;
      else if (v.side === "右") label = `${v.name}（右）`;
    }
    options.push({
      key,
      exerciseId: v.exerciseId,
      name: v.name,
      side: v.side,
      label,
      category: v.category,
      isBodyweight: !v.hasWeight,
    });
  });

  // Sort by category → name → side (both → left → right)
  const catOrder = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio", "other"];
  const sideOrder: Record<string, number> = { "": 0, "both": 0, "左": 1, "右": 2 };
  options.sort((a, b) =>
    (catOrder.indexOf(a.category) - catOrder.indexOf(b.category))
    || a.name.localeCompare(b.name)
    || (sideOrder[a.side] ?? 3) - (sideOrder[b.side] ?? 3)
  );
  return options;
}

function buildTimeSeries(
  workouts: Workout[],
  exerciseId: number,
  side: string,
  metric: string,
): DataPoint[] {
  const points: DataPoint[] = [];

  // Sort workouts by date
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

  for (const w of sorted) {
    const matchingExercises = (w.workout_exercises ?? []).filter(
      (we) => we.exercise_id === exerciseId && (we.side || "") === side
    );
    if (matchingExercises.length === 0) continue;

    let value = 0;
    for (const we of matchingExercises) {
      const sets = we.workout_sets ?? [];
      if (metric === "max_weight") {
        const maxW = Math.max(0, ...sets.map((s) => Number(s.weight) || 0));
        value = Math.max(value, maxW);
      } else if (metric === "volume") {
        const vol = sets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
        value += vol;
      } else if (metric === "max_reps") {
        const maxR = Math.max(0, ...sets.map((s) => Number(s.reps) || 0));
        value = Math.max(value, maxR);
      }
    }

    const d = new Date(w.date + "T00:00:00");
    points.push({
      date: w.date,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value,
    });
  }

  return points;
}

function filterByPeriod(points: DataPoint[], periodKey: string): DataPoint[] {
  if (periodKey === "all") return points;
  const p = PERIODS.find((p) => p.key === periodKey);
  if (!p || p.months === 0) return points;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - p.months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return points.filter((pt) => pt.date >= cutoffStr);
}

export default function GraphsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [metric, setMetric] = useState("max_weight");
  const [period, setPeriod] = useState("3M");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    Promise.all([workoutsApi.list(), exercisesApi.list()])
      .then(([ws, exs]) => {
        setWorkouts(ws);
        setExercises(exs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready]);

  const options = useMemo(() => buildOptions(workouts, exercises), [workouts, exercises]);

  // Auto-select first option
  useEffect(() => {
    if (options.length > 0 && !selectedKey) {
      setSelectedKey(options[0].key);
    }
  }, [options, selectedKey]);

  const selected = options.find((o) => o.key === selectedKey);

  // Auto-switch metric for bodyweight exercises
  useEffect(() => {
    if (selected?.isBodyweight && (metric === "max_weight" || metric === "volume")) {
      setMetric("max_reps");
    }
  }, [selected, metric]);

  const allPoints = useMemo(() => {
    if (!selected) return [];
    return buildTimeSeries(workouts, selected.exerciseId, selected.side, metric);
  }, [workouts, selected, metric]);

  const filteredPoints = useMemo(() => filterByPeriod(allPoints, period), [allPoints, period]);

  // Stats
  const latestValue = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1].value : null;
  const prEntry = filteredPoints.length > 0
    ? filteredPoints.reduce((best, pt) => pt.value > best.value ? pt : best, filteredPoints[0])
    : null;
  // PR date: first occurrence of max value
  const prValue = prEntry?.value ?? 0;
  const prFirst = filteredPoints.find((pt) => pt.value === prValue);
  const prDate = prFirst ? (() => {
    const d = new Date(prFirst.date + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  })() : null;

  const startValue = filteredPoints.length > 0 ? filteredPoints[0].value : null;
  const vsStart = startValue && startValue > 0 && latestValue !== null
    ? Math.round(((latestValue - startValue) / startValue) * 100)
    : null;
  const vsStartAbs = startValue && latestValue !== null ? latestValue - startValue : null;

  const unit = metric === "max_reps" ? "回" : "kg";

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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
        </div>
      ) : options.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="text-[32px] mb-3 opacity-40">📊</div>
          <div className="text-[15px] font-bold text-gray-900 mb-1">データがありません</div>
          <div className="text-xs text-gray-500">ワークアウトを記録するとグラフが表示されます</div>
        </div>
      ) : (
        <div className="px-4 pb-6 flex flex-col gap-3">
          {/* Exercise picker */}
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)]
              px-3.5 py-3 flex items-center justify-between text-left"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-gray-400 tracking-[0.12em]">EXERCISE</span>
              <span className="text-[15px] font-bold text-gray-900 tracking-tight">{selected?.label ?? "種目を選択"}</span>
            </div>
            <svg className="text-gray-500" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Metric segmented control */}
          <div className="flex">
            <div className="inline-flex p-[3px] bg-[#F3F3F6] rounded-[10px]">
              {METRICS.map((m) => {
                const isActive = metric === m.key;
                const isDisabled = selected?.isBodyweight && m.key !== "max_reps";
                return (
                  <button
                    key={m.key}
                    onClick={() => !isDisabled && setMetric(m.key)}
                    disabled={isDisabled}
                    className={`px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                      isActive
                        ? "bg-white text-gray-900 font-bold shadow-[0_1px_2px_rgba(15,18,40,0.08)]"
                        : "text-gray-500 font-medium"
                    } ${isDisabled ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Graph card */}
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] p-3.5">
            {/* Summary stats */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start pb-3 mb-3 border-b border-black/[0.06]">
              {/* Latest */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1">最新</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[22px] font-bold text-gray-900 tracking-tighter leading-none">
                    {latestValue !== null ? latestValue.toLocaleString() : "—"}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">{unit}</span>
                </div>
              </div>

              {/* PR */}
              <div
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-[10px] min-w-[76px]"
                style={{ background: "oklch(0.96 0.04 60)" }}
              >
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1l1 2.8L9 4.2 7 6l.5 3L5 7.5 2.5 9 3 6 1 4.2 4 3.8 5 1z" fill="oklch(0.55 0.16 60)"/>
                  </svg>
                  <span className="text-[9px] font-bold tracking-[0.08em]" style={{ color: "oklch(0.42 0.14 60)" }}>PR</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-mono text-[17px] font-bold tracking-tight leading-none" style={{ color: "oklch(0.42 0.14 60)" }}>
                    {prValue > 0 ? prValue.toLocaleString() : "—"}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: "oklch(0.42 0.14 60)" }}>{unit}</span>
                </div>
                {prDate && (
                  <span className="font-mono text-[9px] font-semibold" style={{ color: "oklch(0.5 0.12 60)" }}>{prDate}</span>
                )}
              </div>

              {/* vs Start */}
              <div className="text-right">
                <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1">vs 開始時</div>
                {vsStart !== null && vsStartAbs !== null ? (
                  <>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="font-mono text-[22px] font-bold tracking-tighter leading-none" style={{ color: "oklch(0.42 0.12 145)" }}>
                        {vsStartAbs >= 0 ? "+" : ""}{vsStartAbs}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500">{unit}</span>
                    </div>
                    <div className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold justify-end" style={{ color: "oklch(0.5 0.12 145)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d={vsStartAbs >= 0
                          ? "M2 8.5L5 5.5l2 1.5L10 4M10 4h-2.5M10 4v2.5"
                          : "M2 3.5L5 6.5l2-1.5L10 8M10 8h-2.5M10 8V5.5"
                        } stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-mono">{vsStart >= 0 ? "+" : ""}{vsStart}%</span>
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-gray-400">—</span>
                )}
              </div>
            </div>

            {/* Period toggle */}
            <div className="flex items-center mb-2.5">
              <div className="inline-flex p-[3px] bg-[#F3F3F6] rounded-[10px]">
                {PERIODS.map((p) => {
                  const isActive = period === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                        isActive
                          ? "bg-white text-gray-900 font-bold shadow-[0_1px_2px_rgba(15,18,40,0.08)]"
                          : "text-gray-500 font-medium"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            {filteredPoints.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-gray-400 mb-2">この期間に記録がありません</div>
                <button
                  onClick={() => setPeriod("all")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-500"
                >
                  全期間で表示
                </button>
              </div>
            ) : filteredPoints.length === 1 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-gray-400">データを蓄積中</div>
              </div>
            ) : (
              <GraphChart data={filteredPoints} unit={unit} accent={ACCENT} />
            )}
          </div>
        </div>
      )}

      {/* Exercise picker sheet */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end"
          style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-[20px] px-5 pt-6 pb-8 max-h-[70%] overflow-auto"
            style={{ animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] mb-3">種目を選択</div>
            <div className="flex flex-col gap-0.5">
              {(() => {
                let lastCat = "";
                return options.map((opt) => {
                  const isActive = opt.key === selectedKey;
                  const showCat = opt.category !== lastCat;
                  lastCat = opt.category;
                  return (
                    <div key={opt.key}>
                      {showCat && (
                        <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] px-3 pt-3 pb-1">
                          {CATEGORY_JP[opt.category] ?? opt.category}
                        </div>
                      )}
                      <button
                        onClick={() => { setSelectedKey(opt.key); setPickerOpen(false); }}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left text-sm ${
                          isActive ? "font-bold" : "font-medium"
                        }`}
                        style={{ color: isActive ? ACCENT : undefined }}
                      >
                        <span>{opt.label}</span>
                        {isActive && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7.5l2.5 2.5L11 4" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
