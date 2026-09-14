import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { runAccuracyEvaluation } from "../packages/core/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const benchmarksDir = path.join(rootDir, "benchmarks");
const historyFile = path.join(benchmarksDir, "accuracy-history.json");

console.log("🦅 Running Wren Accuracy Benchmark Evaluation (100 Ground-Truth Samples)...");

const startTime = Date.now();
const evalResult = await runAccuracyEvaluation();
const durationMs = Date.now() - startTime;

console.log("\n===============================================================================");
console.log(` Wren Accuracy Scorecard — ${evalResult.timestamp} (Duration: ${durationMs}ms)`);
console.log("===============================================================================");

console.log(`\nOverall Metrics:`);
console.log(`  Total Evaluated:      ${evalResult.overall.total}`);
console.log(`  True Positives (TP):  ${evalResult.overall.truePositives}`);
console.log(`  False Positives (FP): ${evalResult.overall.falsePositives}`);
console.log(`  True Negatives (TN):  ${evalResult.overall.trueNegatives}`);
console.log(`  False Negatives (FN): ${evalResult.overall.falseNegatives}`);
console.log(`  Precision:            ${(evalResult.overall.precision * 100).toFixed(1)}%`);
console.log(`  Recall:               ${(evalResult.overall.recall * 100).toFixed(1)}%`);
console.log(`  F1 Score:             ${evalResult.overall.f1Score.toFixed(4)}`);
console.log(`  False Positive Rate:  ${(evalResult.overall.falsePositiveRate * 100).toFixed(1)}%`);

console.log("\nMetrics by Category:");
for (const [cat, metrics] of Object.entries(evalResult.byCategory)) {
  console.log(
    `  ${cat.padEnd(16)} | Precision: ${(metrics.precision * 100).toFixed(1).padStart(5)}% | Recall: ${(metrics.recall * 100).toFixed(1).padStart(5)}% | F1: ${metrics.f1Score.toFixed(4)} | TP: ${metrics.truePositives} FP: ${metrics.falsePositives} TN: ${metrics.trueNegatives} FN: ${metrics.falseNegatives}`
  );
}
console.log("===============================================================================\n");

if (!fs.existsSync(benchmarksDir)) {
  fs.mkdirSync(benchmarksDir, { recursive: true });
}

let history = [];
if (fs.existsSync(historyFile)) {
  try {
    history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  } catch {}
}

history.push({
  timestamp: evalResult.timestamp,
  engineVersion: evalResult.engineVersion,
  durationMs,
  overall: evalResult.overall,
  byCategory: evalResult.byCategory,
});

fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
console.log(`✔ Benchmark record saved to ${path.relative(rootDir, historyFile)}`);

const shouldAssert = process.argv.includes("--assert-thresholds");
if (shouldAssert) {
  const precisionMin = 0.9;
  const recallMin = 0.9;

  if (evalResult.overall.precision < precisionMin || evalResult.overall.recall < recallMin) {
    console.error(
      `✖ Accuracy evaluation failed threshold assertion (Precision >= ${precisionMin * 100}%, Recall >= ${recallMin * 100}%)`
    );
    process.exit(1);
  } else {
    console.log(`✔ All accuracy thresholds satisfied.`);
    process.exit(0);
  }
}
