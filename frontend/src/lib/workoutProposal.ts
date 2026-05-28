export interface ProposedSet {
  weight: number;
  reps: number;
  type: "warmup" | "working";
}

/**
 * ワーキング重量から5セット構成を生成する。
 *
 * | セット | 重量          | 回数 | 種別    |
 * |--------|---------------|------|---------|
 * | 1      | ワーキング×0.6 | 10   | warmup  |
 * | 2      | ワーキング×0.8 | 8    | warmup  |
 * | 3      | ワーキング×1.0 | 10   | working |
 * | 4      | ワーキング×1.0 | 10   | working |
 * | 5      | ワーキング×1.0 | 10   | working |
 *
 * W-up重量は丸めず計算値をそのまま返す。
 */
export function generateSets(workingWeight: number): ProposedSet[] {
  return [
    { weight: Number((workingWeight * 0.6).toFixed(1)), reps: 10, type: "warmup" },
    { weight: Number((workingWeight * 0.8).toFixed(1)), reps: 8, type: "warmup" },
    { weight: workingWeight, reps: 10, type: "working" },
    { weight: workingWeight, reps: 10, type: "working" },
    { weight: workingWeight, reps: 10, type: "working" },
  ];
}
