"use client";

import { useState, useEffect, useRef } from "react";

const ACCENT = "#5b5bf2";
const ROW_H = 60;
const GAP = 8;
const TOTAL = ROW_H + GAP;

interface ReorderItem {
  id: string;
  name: string;
  side: string;
  setsCount: number;
}

interface DragState {
  fromIdx: number;
  startY: number;
  dy: number;
  toIdx: number;
}

export default function ReorderList({
  items,
  onReorder,
}: {
  items: ReorderItem[];
  onReorder: (reordered: ReorderItem[]) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const startDrag = (i: number, clientY: number) => {
    setDrag({ fromIdx: i, startY: clientY, dy: 0, toIdx: i });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const y = e.clientY;
      const dy = y - drag.startY;
      const offset = Math.round(dy / TOTAL);
      const toIdx = Math.max(0, Math.min(itemsRef.current.length - 1, drag.fromIdx + offset));
      setDrag((prev) => prev && { ...prev, dy, toIdx });
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      setDrag((prev) => {
        if (prev && prev.fromIdx !== prev.toIdx) {
          const next = [...itemsRef.current];
          const [moved] = next.splice(prev.fromIdx, 1);
          next.splice(prev.toIdx, 0, moved);
          onReorderRef.current(next);
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.fromIdx, drag?.startY]);

  return (
    <div className="flex flex-col relative" style={{ gap: GAP }}>
      {items.map((item, i) => {
        let translateY = 0;
        let isDragging = false;
        if (drag) {
          if (i === drag.fromIdx) {
            translateY = drag.dy;
            isDragging = true;
          } else if (drag.fromIdx < drag.toIdx && i > drag.fromIdx && i <= drag.toIdx) {
            translateY = -TOTAL;
          } else if (drag.fromIdx > drag.toIdx && i < drag.fromIdx && i >= drag.toIdx) {
            translateY = TOTAL;
          }
        }

        return (
          <div
            key={item.id}
            className="flex items-center bg-white rounded-xl px-2"
            style={{
              height: ROW_H,
              border: `1px solid ${isDragging ? ACCENT + "66" : "rgba(15,18,40,0.08)"}`,
              transform: `translateY(${translateY}px) ${isDragging ? "scale(1.02)" : ""}`,
              transition: isDragging
                ? "none"
                : "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.15s",
              boxShadow: isDragging
                ? "0 12px 32px rgba(15,18,40,0.18), 0 2px 6px rgba(15,18,40,0.08)"
                : "0 1px 2px rgba(15,18,40,0.03)",
              zIndex: isDragging ? 20 : 1,
              position: "relative",
              userSelect: "none",
            }}
          >
            {/* Grip handle */}
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                startDrag(i, e.clientY);
              }}
              className="w-11 h-11 border-none bg-transparent flex items-center justify-center flex-shrink-0"
              style={{
                cursor: isDragging ? "grabbing" : "grab",
                color: "rgb(156 163 175)",
                touchAction: "none",
              }}
              aria-label="ドラッグして並び替え"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 5h10M4 9h10M4 13h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Name + info */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="text-[15px] font-semibold text-gray-900 tracking-tight truncate">
                {item.name || "（種目未選択）"}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {item.setsCount}セット
                {item.side && (
                  <span className="ml-2 text-gray-500">
                    {item.side}側
                  </span>
                )}
              </div>
            </div>

            {/* Order badge */}
            <div className="text-[11px] font-semibold text-gray-400 font-mono px-2 py-1 bg-[#F3F3F6] rounded-md">
              {i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
