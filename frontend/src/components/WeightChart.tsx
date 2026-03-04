"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { BodyRecord } from "@/lib/types";

interface Props {
  records: BodyRecord[];
  dataKey: "weight" | "body_fat_percentage";
  unit: string;
  color: string;
  label: string;
}

export default function WeightChart({
  records,
  dataKey,
  unit,
  color,
  label,
}: Props) {
  const data = [...records]
    .reverse()
    .slice(-30)
    .map((r) => ({
      date: r.date.slice(5).replace("-", "/"),
      value: r[dataKey] != null ? parseFloat(r[dataKey]!) : null,
    }))
    .filter((d) => d.value !== null);

  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">データなし</p>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            formatter={(v) => [`${v} ${unit}`, label]}
            labelStyle={{ fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
