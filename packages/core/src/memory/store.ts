import type { Finding } from "@wren/shared-types";
import type { VerificationResult } from "../agent/types";
import type {
  MemoryEntry,
  MemoryLookupResult,
  MemoryStore,
  MemoryStoreConfig,
} from "./types";
import { DEFAULT_MEMORY_CONFIG } from "./types";
import { computeCodeHash } from "./hash";
import { generateCodeEmbedding } from "./embeddings";
import { sanitizePatternForGlobalMemory } from "./anonymizer";

export interface ExtendedMemoryStoreConfig extends MemoryStoreConfig {
  supabaseClient?: {
    rpc: (
      fn: string,
      params: Record<string, unknown>
    ) => Promise<{ data: any; error: any }>;
    from: (table: string) => {
      insert: (rows: any) => Promise<{ error: any }>;
    };
  };
  embeddingClient?: any;
}

export function createMemoryStore(config: ExtendedMemoryStoreConfig = {}): MemoryStore {
  const highThreshold =
    config.highConfidenceThreshold ?? DEFAULT_MEMORY_CONFIG.highConfidenceThreshold;
  const mediumThreshold =
    config.mediumConfidenceThreshold ?? DEFAULT_MEMORY_CONFIG.mediumConfidenceThreshold;
  const defaultProjectId = config.projectId;

  const localHashMap = new Map<string, MemoryEntry>();

  function getLocalKey(projectId: string | undefined, codeHash: string): string {
    return `${projectId || "default"}::${codeHash}`;
  }

  return {
    async lookup(finding: Finding, projectId?: string): Promise<MemoryLookupResult> {
      const activeProject = projectId || defaultProjectId;
      const snippet = finding.location.snippet || finding.message || "";
      const codeHash = computeCodeHash(finding.ruleId, snippet);

      const localKey = getLocalKey(activeProject, codeHash);
      const exactMatch = localHashMap.get(localKey);
      if (exactMatch) {
        return {
          hit: true,
          hitType: "EXACT_HASH",
          match: {
            entry: exactMatch,
            similarity: 1.0,
            hitType: "EXACT_HASH",
          },
        };
      }

      const supabase = config.supabaseClient;
      if (!supabase) {
        return { hit: false, hitType: "MISS" };
      }

      try {
        const embedding = await generateCodeEmbedding(snippet, {
          apiKey: config.openaiApiKey,
          client: config.embeddingClient,
          timeoutMs: config.timeoutMs,
        });

        if (!embedding) {
          return { hit: false, hitType: "MISS" };
        }

        const { data, error } = await supabase.rpc("match_pattern_memory", {
          query_embedding: embedding,
          target_rule_id: finding.ruleId,
          match_threshold: mediumThreshold,
          match_limit: 1,
          target_project_id: activeProject || null,
        });

        if (error || !Array.isArray(data) || data.length === 0) {
          return { hit: false, hitType: "MISS" };
        }

        const top = data[0];
        const similarity = typeof top.similarity === "number" ? top.similarity : 0.85;

        const entry: MemoryEntry = {
          id: top.id,
          projectId: top.project_id,
          isGlobal: Boolean(top.is_global),
          ruleId: top.rule_id,
          category: finding.category,
          codeHash,
          codeSnippet: top.code_snippet,
          verdict: top.verdict,
          confidence: top.confidence ?? 1.0,
          rationale: top.rationale || "Resolved via vector memory match.",
          suggestedFix: top.suggested_fix,
        };

        const hitType =
          similarity >= highThreshold
            ? "VECTOR_HIGH_CONFIDENCE"
            : "VECTOR_CONTEXT";

        localHashMap.set(localKey, entry);

        return {
          hit: true,
          hitType,
          match: {
            entry,
            similarity,
            hitType,
          },
        };
      } catch {

        return { hit: false, hitType: "MISS" };
      }
    },

    async save(
      finding: Finding,
      verification: VerificationResult,
      projectId?: string,
      isGlobal: boolean = true
    ): Promise<void> {
      const activeProject = projectId || defaultProjectId;
      const snippet = finding.location.snippet || finding.message || "";
      const codeHash = computeCodeHash(finding.ruleId, snippet);

      const entry: MemoryEntry = {
        projectId: activeProject,
        isGlobal: false,
        ruleId: finding.ruleId,
        category: finding.category,
        codeHash,
        codeSnippet: snippet,
        verdict: verification.verdict,
        confidence: verification.confidence,
        rationale: verification.rationale,
        suggestedFix: verification.suggestedFix || finding.fix,
        adjustedSeverity: verification.adjustedSeverity,
      };

      localHashMap.set(getLocalKey(activeProject, codeHash), entry);

      const supabase = config.supabaseClient;
      if (!supabase) return;

      try {
        const rowsToInsert: any[] = [];

        if (activeProject) {
          rowsToInsert.push({
            project_id: activeProject,
            is_global: false,
            rule_id: finding.ruleId,
            category: finding.category,
            code_hash: codeHash,
            code_snippet: snippet,
            verdict: verification.verdict,
            confidence: verification.confidence,
            rationale: verification.rationale,
            suggested_fix: verification.suggestedFix || finding.fix,
          });
        }

        if (isGlobal) {
          const { sanitizedSnippet, sanitizedRationale } =
            sanitizePatternForGlobalMemory(snippet, verification.rationale);

          rowsToInsert.push({
            project_id: null,
            is_global: true,
            rule_id: finding.ruleId,
            category: finding.category,
            code_hash: computeCodeHash(finding.ruleId, sanitizedSnippet),
            code_snippet: sanitizedSnippet,
            verdict: verification.verdict,
            confidence: verification.confidence,
            rationale: sanitizedRationale,
            suggested_fix: verification.suggestedFix || finding.fix,
          });
        }

        await supabase.from("agent_pattern_memory").insert(rowsToInsert);
      } catch {

      }
    },
  };
}
