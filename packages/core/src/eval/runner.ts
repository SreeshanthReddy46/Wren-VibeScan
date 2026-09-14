import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  GroundTruthSnippet,
  EvalResult,
  EvalRunnerOptions,
  EvalSnippetResult,
} from "./types";
import { GROUND_TRUTH_DATASET } from "./dataset";
import { computeMetrics } from "./metrics";
import { discoverFiles } from "../file-discovery";
import { runStaticScan } from "../static-scan";
import { runAstScan } from "../ast-scan";

export async function runAccuracyEvaluation(
  options: EvalRunnerOptions = {}
): Promise<EvalResult> {
  const snippets = options.snippets || GROUND_TRUTH_DATASET;
  const baseTmp = fs.mkdtempSync(path.join(os.tmpdir(), "wren-eval-"));
  const results: EvalSnippetResult[] = [];

  try {
    for (const snippet of snippets) {
      const snippetDir = path.join(baseTmp, snippet.id);
      const filePath = path.join(snippetDir, snippet.fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, snippet.code, "utf8");

      const files = discoverFiles(snippetDir);
      const staticFindings = runStaticScan(files);
      const astFindings = runAstScan(files);
      const combined = [...staticFindings, ...astFindings];

      const detectedRuleIds = combined.map((f) => f.ruleId);
      const hasFindings = combined.length > 0;

      let classification: "TP" | "FP" | "TN" | "FN";
      let isCorrect = false;

      if (snippet.expectedVulnerable) {
        if (hasFindings) {
          if (snippet.expectedRuleId) {
            const matchesExpected = detectedRuleIds.includes(snippet.expectedRuleId);
            if (matchesExpected) {
              classification = "TP";
              isCorrect = true;
            } else {
              classification = "FN";
              isCorrect = false;
            }
          } else {
            classification = "TP";
            isCorrect = true;
          }
        } else {
          classification = "FN";
          isCorrect = false;
        }
      } else {
        if (!hasFindings) {
          classification = "TN";
          isCorrect = true;
        } else {
          classification = "FP";
          isCorrect = false;
        }
      }

      results.push({
        snippet,
        findingsCount: combined.length,
        isCorrect,
        classification,
        detectedRuleIds,
      });
    }

    const overall = computeMetrics(results);

    const categories = ["secret", "auth", "database", "configuration"];
    const byCategory: Record<string, any> = {};

    for (const cat of categories) {
      const catResults = results.filter((r) => r.snippet.category === cat);
      byCategory[cat] = computeMetrics(catResults);
    }

    return {
      overall,
      byCategory,
      results,
      timestamp: new Date().toISOString(),
      engineVersion: "1.1.0",
    };
  } finally {
    try {
      fs.rmSync(baseTmp, { recursive: true, force: true });
    } catch {}
  }
}
