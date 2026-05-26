"use client";

const CONDITIONS = [
  { value: 1, label: "最悪" },
  { value: 2, label: "悪い" },
  { value: 3, label: "普通" },
  { value: 4, label: "良い" },
  { value: 5, label: "最高" },
];

const ACCENT = "#5b5bf2";

export default function ConditionScale({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const activeIndex = value - 1; // 0-4

  return (
    <div className="px-2">
      {/* Dots + track */}
      <div className="relative h-8 flex items-center">
        {/* Gradient scale track */}
        <div
          className="absolute left-4 right-4 h-[3px] rounded-sm"
          style={{
            background:
              "linear-gradient(to right, oklch(0.85 0.06 25), oklch(0.9 0.04 60), oklch(0.92 0.005 270), oklch(0.88 0.06 145), oklch(0.85 0.08 200))",
          }}
        />
        {/* Progress highlight */}
        <div
          className="absolute left-4 h-[3px] rounded-sm"
          style={{
            background: ACCENT,
            width: `calc((100% - 32px) * ${activeIndex / 4})`,
            transition: "width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
        {/* Dots */}
        <div className="relative z-10 flex justify-between items-center w-full">
          {CONDITIONS.map((c) => {
            const active = c.value === value;
            return (
              <button
                key={c.value}
                onClick={() => onChange(c.value)}
                className="w-8 h-8 p-0 border-none bg-transparent flex items-center justify-center cursor-pointer"
                aria-label={c.label}
              >
                <span
                  className="rounded-full block"
                  style={{
                    width: active ? 16 : 12,
                    height: active ? 16 : 12,
                    background: active ? ACCENT : "#fff",
                    border: active ? "2px solid #fff" : "2px solid rgba(15,18,40,0.12)",
                    boxShadow: active
                      ? `0 0 0 2px ${ACCENT}, 0 4px 10px ${ACCENT}40`
                      : "none",
                    transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-1">
        {CONDITIONS.map((c) => {
          const active = c.value === value;
          return (
            <div
              key={c.value}
              className="w-8 text-center"
              style={{
                fontSize: active ? 12 : 11,
                fontWeight: active ? 700 : 500,
                color: active ? "#1a1a2e" : "rgb(156 163 175)",
                transition: "all 0.2s ease",
                letterSpacing: "0.02em",
              }}
            >
              {c.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
