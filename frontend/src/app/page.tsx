"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTokens, workoutsApi } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import type { Workout } from "@/lib/types";

const ACCENT = "#5b5bf2";
const GYM: Record<string, { hue: number; label: string }> = {
  anytime: { hue: 245, label: "エニタイム" },
  personal: { hue: 290, label: "パーソナル" },
  home: { hue: 145, label: "自宅" },
  municipal: { hue: 30, label: "区営ジム" },
};
const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function calcVolume(w: Workout): number {
  return (w.workout_exercises ?? []).reduce(
    (a, we) => a + (we.workout_sets ?? []).reduce(
      (b, ws) => b + (Number(ws.weight) || 0) * (Number(ws.reps) || 0), 0
    ), 0
  );
}

function getISOWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // ISO week: Monday is first day. Adjust to get Thursday of the same week.
  const day = date.getDay() || 7; // Sunday=7
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getFullYear()}-W${weekNum}`;
}

function calcStreakWeeks(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const weekSet = new Set(workouts.map((w) => getISOWeekKey(new Date(w.date + "T00:00:00"))));
  const now = new Date();
  let streak = 0;
  const checkDate = new Date(now);
  // Start from current week, go backwards
  for (let i = 0; i < 200; i++) {
    const key = getISOWeekKey(checkDate);
    if (weekSet.has(key)) {
      streak++;
    } else {
      break;
    }
    // Go to previous week
    checkDate.setDate(checkDate.getDate() - 7);
  }
  return streak;
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    workoutsApi.list()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready]);

  // Monthly filter
  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const monthlyWorkouts = useMemo(
    () => workouts.filter((w) => w.date.startsWith(monthPrefix)),
    [workouts, monthPrefix]
  );

  // Previous month volume
  const prevMonthPrefix = useMemo(() => {
    const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    return `${py}-${String(pm + 1).padStart(2, "0")}`;
  }, [selectedYear, selectedMonth]);
  const prevMonthWorkouts = useMemo(
    () => workouts.filter((w) => w.date.startsWith(prevMonthPrefix)),
    [workouts, prevMonthPrefix]
  );

  const monthlyVolume = monthlyWorkouts.reduce((a, w) => a + calcVolume(w), 0);
  const prevMonthVolume = prevMonthWorkouts.reduce((a, w) => a + calcVolume(w), 0);
  const volumeDelta = prevMonthVolume > 0
    ? Math.round(((monthlyVolume - prevMonthVolume) / prevMonthVolume) * 100)
    : null;

  // Gym breakdown
  const gymCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthlyWorkouts.forEach((w) => {
      if (w.gym_type) counts[w.gym_type] = (counts[w.gym_type] || 0) + 1;
    });
    return Object.entries(counts).filter(([, c]) => c > 0);
  }, [monthlyWorkouts]);

  // Global status
  const sortedAll = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date)),
    [workouts]
  );
  const lastWorkout = sortedAll[0] ?? null;
  const daysSinceLast = lastWorkout ? daysSince(lastWorkout.date) : null;
  const streakWeeks = useMemo(() => calcStreakWeeks(workouts), [workouts]);

  // Calendar data
  const calendarDotMap = useMemo(() => {
    const map: Record<number, string> = {};
    // Sort by date asc so last session wins
    const sorted = [...monthlyWorkouts].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((w) => {
      const day = parseInt(w.date.split("-")[2]);
      if (w.gym_type) map[day] = w.gym_type;
    });
    return map;
  }, [monthlyWorkouts]);

  // Calendar: find workout for a given day (for navigation)
  const workoutByDay = useMemo(() => {
    const map: Record<number, Workout> = {};
    const sorted = [...monthlyWorkouts].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((w) => {
      const day = parseInt(w.date.split("-")[2]);
      map[day] = w; // last one wins
    });
    return map;
  }, [monthlyWorkouts]);

  // Calendar grid
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calendarWeeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfMonth).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { calendarWeeks.push(week); week = []; }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    calendarWeeks.push(week);
  }
  while (calendarWeeks.length < 6) calendarWeeks.push(Array(7).fill(null));

  const todayDay = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth ? now.getDate() : null;
  const calendarLabel = `${selectedYear}年 ${selectedMonth + 1}月`;

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(selectedYear - 1); setSelectedMonth(11); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedYear(selectedYear + 1); setSelectedMonth(0); }
    else setSelectedMonth(selectedMonth + 1);
  };

  // Last workout details
  const lastWDate = lastWorkout ? new Date(lastWorkout.date + "T00:00:00") : null;
  const lastWExercises = lastWorkout
    ? [...(lastWorkout.workout_exercises ?? [])].sort((a, b) => a.order - b.order)
    : [];

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
        <span className="text-xl font-bold text-gray-900 tracking-tight">ホーム</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="px-4 pb-6 flex flex-col gap-3">
          {/* Card 1: STATUS */}
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] px-4 py-3.5">
            <div className="text-[10px] font-semibold text-gray-400 tracking-[0.12em] mb-3">STATUS</div>
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Streak chip */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "oklch(0.96 0.04 25)", color: "oklch(0.42 0.14 25)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5c-1.5 2.5-3 4-3 6a3 3 0 0 0 6 0c0-1.4-1-2.5-1-2.5s.4 1.2-.8 1.2c-.6 0-.7-.6-.4-1.2.4-1-.3-2.5-.8-3.5z" fill="oklch(0.55 0.16 25)"/>
                </svg>
                <span className="font-mono text-[13px] font-bold tracking-tight">{streakWeeks}</span>
                <span className="text-[11px] font-bold tracking-wide">週連続</span>
              </div>

              {/* Days since last */}
              <div className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span className="text-[11px] font-semibold text-gray-400 tracking-wide">前回から</span>
                <span className="font-mono text-[13px] font-bold text-gray-900">
                  {daysSinceLast ?? "—"}
                </span>
                <span className="text-[11px] font-medium text-gray-500">日</span>
                <span className="text-[11px] font-semibold text-gray-400 tracking-wide">経過</span>
              </div>
            </div>
          </div>

          {/* Card 2: SUMMARY */}
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] px-4 py-3.5">
            <div className="text-[10px] font-semibold text-gray-400 tracking-[0.12em] mb-3">
              {selectedMonth + 1}月のサマリー
            </div>

            {/* Top: count + gym breakdown (2-column) */}
            <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1">今月の回数</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[28px] font-bold text-gray-900 tracking-tighter leading-none">
                    {monthlyWorkouts.length}
                  </span>
                  <span className="text-xs font-medium text-gray-500">回</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1">ジム別</div>
                <div className="flex flex-wrap gap-1">
                  {gymCounts.map(([key, count]) => {
                    const g = GYM[key];
                    if (!g) return null;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold tracking-wide"
                        style={{
                          background: `oklch(0.96 0.02 ${g.hue})`,
                          color: `oklch(0.4 0.08 ${g.hue})`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: `oklch(0.6 0.15 ${g.hue})` }}
                        />
                        {g.label}
                        <span className="font-mono font-bold ml-0.5">{count}</span>
                      </span>
                    );
                  })}
                  {gymCounts.length === 0 && (
                    <span className="text-[11px] text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Total volume */}
            <div className="mt-3.5 pt-3 border-t border-black/[0.06]">
              <div className="text-[10px] font-semibold text-gray-400 tracking-[0.08em] mb-1">総ボリューム</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[19px] font-bold text-gray-900 tracking-tight leading-none">
                  {monthlyVolume.toLocaleString()}
                </span>
                <span className="text-[11px] font-medium text-gray-500">kg</span>
                {volumeDelta !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-bold"
                    style={{ color: volumeDelta >= 0 ? "oklch(0.5 0.12 145)" : "oklch(0.5 0.14 25)" }}
                  >
                    {volumeDelta >= 0 ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 8.5L5 5.5l2 1.5L10 4M10 4h-2.5M10 4v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 3.5L5 6.5l2-1.5L10 8M10 8h-2.5M10 8V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <span className="font-mono">{volumeDelta >= 0 ? "+" : ""}{volumeDelta}%</span>
                    <span className="text-gray-400 font-medium ml-0.5">vs 先月</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: CALENDAR */}
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] p-3.5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2.5">
              <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center text-gray-500">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 tracking-tight">{calendarLabel}</span>
                {(selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth()) && (
                  <button
                    onClick={() => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); }}
                    className="px-2 py-0.5 rounded-full border border-black/[0.08] bg-transparent text-[10px] font-semibold text-gray-500 tracking-wide"
                  >
                    今月
                  </button>
                )}
              </span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center text-gray-500">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5">
              {DOW.map((d, i) => (
                <div
                  key={d}
                  className="text-[10px] font-semibold text-center py-1 tracking-wide"
                  style={{
                    color: i === 0 ? "oklch(0.6 0.15 25)" : i === 6 ? "oklch(0.6 0.15 245)" : undefined,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-0.5 mt-0.5">
              {calendarWeeks.flat().map((d, i) => {
                const dow = i % 7;
                const isToday = d !== null && d === todayDay;
                const gymType = d ? calendarDotMap[d] : undefined;
                const gymHue = gymType ? GYM[gymType]?.hue : undefined;
                const hasWorkout = !!gymType;
                const wo = d ? workoutByDay[d] : undefined;

                return (
                  <div
                    key={i}
                    className="relative aspect-square flex items-center justify-center font-mono text-xs tracking-tight"
                    style={{
                      fontWeight: isToday ? 700 : 500,
                      color: d == null ? "transparent"
                        : isToday ? "#fff"
                        : dow === 0 ? "oklch(0.6 0.15 25)"
                        : dow === 6 ? "oklch(0.6 0.15 245)"
                        : undefined,
                      cursor: hasWorkout ? "pointer" : undefined,
                    }}
                    onClick={() => wo && router.push(`/workouts/${wo.id}/edit`)}
                  >
                    {isToday && (
                      <div className="absolute rounded-full" style={{ inset: "15%", background: ACCENT }} />
                    )}
                    <span className="relative z-10">{d}</span>
                    {gymHue !== undefined && !isToday && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: `oklch(0.6 0.15 ${gymHue})` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-2.5 pt-2.5 border-t border-black/[0.04] flex flex-wrap gap-x-2.5 gap-y-1">
              {Object.entries(GYM).map(([, g]) => (
                <span key={g.label} className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `oklch(0.6 0.15 ${g.hue})` }} />
                  {g.label}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4: LAST WORKOUT */}
          <div
            className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] p-3.5 cursor-pointer"
            onClick={() => lastWorkout && router.push(`/workouts/${lastWorkout.id}/edit`)}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] font-semibold text-gray-400 tracking-[0.12em]">LAST WORKOUT</div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {lastWorkout && lastWDate ? (
              <>
                {/* Meta row */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-mono text-[19px] font-bold text-gray-900 tracking-tight">
                    {lastWDate.getMonth() + 1}/{lastWDate.getDate()}
                  </span>
                  <span className="text-[13px] font-bold text-gray-400">
                    ({DOW[lastWDate.getDay()]})
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-gray-500 ml-0.5">
                    {daysSinceLast === 0 ? "今日" : `${daysSinceLast}日前`}
                  </span>
                  <div className="flex-1" />
                  {lastWorkout.gym_type && GYM[lastWorkout.gym_type] && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: `oklch(0.96 0.02 ${GYM[lastWorkout.gym_type].hue})`,
                        color: `oklch(0.4 0.08 ${GYM[lastWorkout.gym_type].hue})`,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d={`M6 1.5a3 3 0 0 1 3 3c0 2.2-3 6-3 6s-3-3.8-3-6a3 3 0 0 1 3-3z`} stroke={`oklch(0.5 0.1 ${GYM[lastWorkout.gym_type].hue})`} strokeWidth="1.3"/>
                        <circle cx="6" cy="4.5" r="1" fill={`oklch(0.5 0.1 ${GYM[lastWorkout.gym_type].hue})`}/>
                      </svg>
                      {GYM[lastWorkout.gym_type].label}
                    </span>
                  )}
                </div>

                {/* Exercise summary */}
                <div className="flex flex-col gap-1 pt-2.5 border-t border-black/[0.04]">
                  {lastWExercises.slice(0, 3).map((we) => (
                    <div key={we.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {we.exercise?.name ?? "不明"}
                      </span>
                      <span className="font-mono text-[11px] font-medium text-gray-500 whitespace-nowrap">
                        {(we.workout_sets ?? []).length}セット
                      </span>
                    </div>
                  ))}
                  {lastWExercises.length > 3 && (
                    <span className="text-[11px] text-gray-400">
                      …+{lastWExercises.length - 3}
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="text-center py-4">
                <div className="text-sm font-bold text-gray-900 mb-2">
                  最初のワークアウトを記録しましょう
                </div>
                <Link
                  href="/workouts/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                  onClick={(e) => e.stopPropagation()}
                >
                  記録を始める
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
