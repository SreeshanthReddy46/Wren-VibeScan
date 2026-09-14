import type { EvalMetrics, EvalSnippetResult } from "./types";

export function computeMetrics(results: EvalSnippetResult[]): EvalMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const r of results) {
    if (r.classification === "TP") tp++;
    else if (r.classification === "FP") fp++;
    else if (r.classification === "TN") tn++;
    else if (r.classification === "FN") fn++;
  }

  const total = results.length;
  const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 1.0;
  const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 1.0;
  const f1Score =
    precision + recall > 0
      ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4))
      : 0.0;
  const falsePositiveRate =
    fp + tn > 0 ? Number((fp / (fp + tn)).toFixed(4)) : 0.0;

  return {
    total,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision,
    recall,
    f1Score,
    falsePositiveRate,
  };
}
