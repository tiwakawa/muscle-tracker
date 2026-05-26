"use client";

import { useState, useEffect } from "react";

const ACCENT = "#5b5bf2";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DatePickerSheet({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  onClose: () => void;
}) {
  const selected = value ? new Date(value + "T00:00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  // Reset view month to selected date's month when calendar opens
  useEffect(() => {
    if (open) {
      const d = value ? new Date(value + "T00:00:00") : new Date();
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [open, value]);

  if (!open) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  // Always pad to 6 rows so the calendar height stays fixed
  while (weeks.length < 6) {
    weeks.push(Array(7).fill(null));
  }

  const monthLabel = `${year}年 ${month + 1}月`;

  const handleSelect = (d: Date) => {
    onChange(toDateStr(d));
    onClose();
  };

  const goToToday = () => {
    const now = new Date();
    onChange(toDateStr(now));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-[20px] px-5 pt-6 pb-8"
        style={{ animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="w-9 h-9 rounded-[10px] bg-[#F3F3F6] flex items-center justify-center text-gray-500"
            aria-label="前の月"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="text-[17px] font-bold text-gray-900 tracking-tight">{monthLabel}</div>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="w-9 h-9 rounded-[10px] bg-[#F3F3F6] flex items-center justify-center text-gray-500"
            aria-label="次の月"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className="text-[11px] font-semibold text-center py-1.5 tracking-wide"
              style={{
                color:
                  i === 0 ? "oklch(0.6 0.15 25)" : i === 6 ? "oklch(0.6 0.15 245)" : "rgb(156 163 175)",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Date grid (always 6 rows for fixed height) */}
        <div className="grid grid-cols-7 gap-0.5">
          {weeks.flat().map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            const dow = d.getDay();
            return (
              <button
                key={i}
                onClick={() => handleSelect(d)}
                className="aspect-square rounded-[10px] border-none cursor-pointer relative font-mono text-[15px]"
                style={{
                  background: isSelected ? ACCENT : "transparent",
                  color: isSelected
                    ? "#fff"
                    : isToday
                      ? ACCENT
                      : dow === 0
                        ? "oklch(0.55 0.15 25)"
                        : dow === 6
                          ? "oklch(0.55 0.15 245)"
                          : undefined,
                  fontWeight: isToday || isSelected ? 700 : 500,
                  transition: "all 0.15s ease",
                }}
              >
                {d.getDate()}
                {isToday && !isSelected && (
                  <span
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Today button */}
        <button
          onClick={goToToday}
          className="mt-4 w-full py-3 border border-black/[0.08] rounded-xl bg-transparent text-sm font-semibold text-gray-500"
        >
          今日に戻る
        </button>
      </div>
    </div>
  );
}
