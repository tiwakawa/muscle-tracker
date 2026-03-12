"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; max_weight: number }[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WeightHistoryChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    max_weight: d.max_weight,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="kg" />
        <Tooltip
          formatter={(value: number) => [`${value} kg`, "最大重量"]}
          labelFormatter={(label) => label}
        />
        <Line
          type="monotone"
          dataKey="max_weight"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={{ r: 3, fill: "#4f46e5" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
