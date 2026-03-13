import type { Workout } from "./types";

const CONDITION_LABEL: Record<number, string> = {
  1: "最悪",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "最高",
};

const GYM_TYPE_LABEL: Record<string, string> = {
  anytime: "エニタイム",
  personal: "パーソナル",
};

export function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${
    ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  })`;
}

export function buildAiText(w: Workout): string {
  const lines: string[] = [];

  let header = `【トレーニング記録】${formatDate(w.date)}`;
  if (w.gym_type && GYM_TYPE_LABEL[w.gym_type]) header += ` ${GYM_TYPE_LABEL[w.gym_type]}`;
  if (w.start_time) {
    const timeStr = w.end_time
      ? `${w.start_time.slice(0, 5)}〜${w.end_time.slice(0, 5)}`
      : `${w.start_time.slice(0, 5)}〜`;
    header += ` ${timeStr}`;
  }
  lines.push(header);

  if (w.condition) lines.push(`コンディション: ${CONDITION_LABEL[w.condition]}`);

  if (w.workout_exercises && w.workout_exercises.length > 0) {
    lines.push("");
    w.workout_exercises.forEach((we, i) => {
      lines.push(we.exercise?.name ?? "不明");
      (we.workout_sets ?? []).forEach((ws) => {
        const setParts: string[] = [];
        if (ws.weight) setParts.push(`${ws.weight}kg`);
        if (ws.reps) setParts.push(`${ws.reps}回`);
        if (setParts.length > 0) lines.push(`  セット${ws.set_number}: ${setParts.join(" × ")}`);
      });
      if (we.memo) lines.push(`  当日メモ: ${we.memo}`);
      if (i < w.workout_exercises!.length - 1) lines.push("");
    });
  }

  if (w.memo) {
    lines.push("");
    lines.push(`ワークアウトメモ: ${w.memo}`);
  }

  return lines.join("\n");
}
