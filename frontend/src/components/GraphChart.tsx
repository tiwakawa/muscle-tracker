"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface DataPoint {
  date: string;
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  unit: string;
  accent: string;
}

export default function GraphChart({ data, unit, accent }: Props) {
  // Find PR (max value, first occurrence)
  const prValue = Math.max(...data.map((d) => d.value));
  const prPoint = data.find((d) => d.value === prValue);

  // Thin out X-axis labels to ~5
  const labelEvery = Math.max(1, Math.floor(data.length / 5));

  return (
    <ResponsiveContainer width="100%" height={200} style={{ outline: "none" }}>
      <AreaChart data={data} margin={{ top: 24, right: 24, left: -12, bottom: 0 }} style={{ outline: "none" }}>
        <defs>
          <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 4"
          stroke="rgba(15,18,40,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "rgb(156 163 175)" }}
          tickLine={false}
          axisLine={false}
          interval={labelEvery - 1}
        />
        <YAxis
          tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "rgb(156 163 175)" }}
          tickLine={false}
          axisLine={false}
          label={{
            value: unit,
            position: "insideTopLeft",
            offset: -4,
            style: { fontSize: 9, fill: "rgb(156 163 175)", fontFamily: "'JetBrains Mono', monospace" },
          }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const val = payload[0].value as number;
            return (
              <div style={{
                background: "#fff",
                border: "1px solid rgba(15,18,40,0.08)",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(15,18,40,0.1)",
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <div style={{ fontSize: 10, color: "rgb(156 163 175)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 700 }}>{val.toLocaleString()} {unit}</div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={accent}
          strokeWidth={2}
          fill="url(#graphFill)"
          dot={{ r: 2.5, fill: accent, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
          animationDuration={400}
        />
        {/* PR marker */}
        {prPoint && (
          <ReferenceDot
            x={prPoint.label}
            y={prPoint.value}
            r={4}
            fill="oklch(0.6 0.15 60)"
            stroke="none"
            label={{
              value: "PR",
              position: "top",
              offset: 8,
              style: {
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                fill: "oklch(0.42 0.14 60)",
              },
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
