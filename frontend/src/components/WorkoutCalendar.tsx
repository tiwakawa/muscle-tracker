"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Workout } from "@/lib/types";

const DOT_COLOR: Record<string, string> = {
  anytime: "bg-indigo-400",
  personal: "bg-rose-500",
};

const DAYS_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

interface Props {
  workouts: Workout[];
  loading: boolean;
}

export default function WorkoutCalendar({ workouts, loading }: Props) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const workoutMap = useMemo(() => {
    const map = new Map<string, Workout[]>();
    workouts.forEach((w) => {
      const key = w.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return map;
  }, [workouts]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-lg"
        >
          ‹
        </button>
        <button
          onClick={() => { setPickerYear(year); setPickerOpen((v) => !v); }}
          className="text-base font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
        >
          {year}年{month + 1}月
        </button>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-lg"
        >
          ›
        </button>
      </div>

      {pickerOpen ? (
        /* Year/Month Picker */
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-lg"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700">{pickerYear}年</span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-lg"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((label, i) => (
              <button
                key={i}
                onClick={() => { setYear(pickerYear); setMonth(i); setPickerOpen(false); }}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  pickerYear === year && i === month
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPickerOpen(false)}
            className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600"
          >
            キャンセル
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Day of week header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayWorkouts = workoutMap.get(key) ?? [];
              const isToday = key === todayStr;
              const dow = new Date(year, month, day).getDay();
              return (
                <div key={key} className="flex flex-col items-center py-0.5">
                  <span
                    className={`text-sm w-8 h-8 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-indigo-600 text-white font-bold"
                        : dow === 0
                        ? "text-red-400"
                        : dow === 6
                        ? "text-blue-400"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </span>
                  {dayWorkouts.length > 0 && (
                    <button
                      className="flex gap-0.5 mt-0.5"
                      onClick={() => {
                        const latest = dayWorkouts.reduce((a, b) => {
                          if (b.start_time && a.start_time) return b.start_time > a.start_time ? b : a;
                          if (b.start_time) return b;
                          return a;
                        });
                        router.push(`/workouts/${latest.id}/edit`);
                      }}
                    >
                      {dayWorkouts.map((w, j) => (
                        <span
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[w.gym_type ?? ""] ?? "bg-indigo-400"}`}
                        />
                      ))}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
