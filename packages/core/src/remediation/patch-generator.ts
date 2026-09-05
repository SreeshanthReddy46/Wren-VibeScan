import * as fs from "fs";
import * as path from "path";
import type { Finding } from "@wren/shared-types";
import { sanitizePatternForGlobalMemory } from "../memory/anonymizer";
import { validateCodeSyntax } from "./syntax-validator";

export interface GeneratePatchOptions {
  fileContent?: string;
  targetPath?: string;
  apiKey?: string;
}

export interface RemediationPatchResult {
  isValid: boolean;
  error?: string;
  patchedContent: string;
  diff: string;
  branchName: string;
  title: string;
  explanation: string;
  filePath: string;
}

export function createUnifiedDiff(
  filePath: string,
  original: string,
  patched: string
): string {
  const normOriginal = original.replace(/\r\n/g, "\n");
  const normPatched = patched.replace(/\r\n/g, "\n");

  const origLines = normOriginal.split("\n");
  const patchLines = normPatched.split("\n");

  const diffChunks: string[] = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
  ];

  let start = 0;
  while (
    start < origLines.length &&
    start < patchLines.length &&
    origLines[start] === patchLines[start]
  ) {
    start++;
  }

  let origEnd = origLines.length - 1;
  let patchEnd = patchLines.length - 1;

  while (
    origEnd >= start &&
    patchEnd >= start &&
    origLines[origEnd] === patchLines[patchEnd]
  ) {
    origEnd--;
    patchEnd--;
  }

  const contextBefore = Math.max(0, start - 2);
  const contextAfterOrig = Math.min(origLines.length, origEnd + 3);
  const contextAfterPatch = Math.min(patchLines.length, patchEnd + 3);

  diffChunks.push(
    `@@ -${contextBefore + 1},${contextAfterOrig - contextBefore} +${contextBefore + 1},${contextAfterPatch - contextBefore} @@`
  );

  for (let i = contextBefore; i < start; i++) {
    diffChunks.push(` ${origLines[i]}`);
  }
  for (let i = start; i <= origEnd; i++) {
    diffChunks.push(`-${origLines[i]}`);
  }
  for (let i = start; i <= patchEnd; i++) {
    diffChunks.push(`+${patchLines[i]}`);
  }
  for (let i = origEnd + 1; i < contextAfterOrig; i++) {
    diffChunks.push(` ${origLines[i]}`);
  }

  return diffChunks.join("\n");
}

export async function generateRemediationPatch(
  finding: Finding,
  options: GeneratePatchOptions = {}
): Promise<RemediationPatchResult> {
  const filePath = finding.location.filePath;
  let originalContent = options.fileContent;

  if (!originalContent) {
    const fullPath = options.targetPath
      ? path.resolve(options.targetPath, filePath)
      : path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      originalContent = fs.readFileSync(fullPath, "utf-8");
    } else {
      originalContent = finding.location.snippet || "";
    }
  }

  let patched = originalContent;

  if (finding.category === "secret") {

    let envVarName = "API_SECRET";
    if (/openai/i.test(finding.title) || /sk-[a-zA-Z0-9]/i.test(originalContent)) {
      envVarName = "OPENAI_API_KEY";
    } else if (/supabase.*service/i.test(finding.title)) {
      envVarName = "SUPABASE_SERVICE_ROLE_KEY";
    } else if (/jwt|token/i.test(finding.title)) {
      envVarName = "JWT_SECRET";
    } else if (/stripe/i.test(finding.title)) {
      envVarName = "STRIPE_SECRET_KEY";
    }

    const secretRegex = /"(sk-[a-zA-Z0-9_-]{20,}|eyJ[a-zA-Z0-9_-]{20,}|[0-9a-f]{32,64})"/g;
    patched = patched.replace(secretRegex, `process.env.${envVarName}`);

    if (finding.fix && finding.fix.replacementCode) {
      if (finding.location.snippet && patched.includes(finding.location.snippet)) {
        patched = patched.replace(finding.location.snippet, finding.fix.replacementCode);
      }
    }
  } else if (finding.fix && finding.fix.replacementCode) {

    if (finding.location.snippet && patched.includes(finding.location.snippet)) {
      patched = patched.replace(finding.location.snippet, finding.fix.replacementCode);
    } else {

      const lines = patched.split("\n");
      const start = Math.max(0, finding.location.startLine - 1);
      const end = Math.min(lines.length, finding.location.endLine);
      lines.splice(start, end - start, finding.fix.replacementCode);
      patched = lines.join("\n");
    }
  }

  let diff = createUnifiedDiff(filePath, originalContent, patched);

  const sanitized = sanitizePatternForGlobalMemory(diff);
  if (sanitized.sanitizedSnippet !== diff) {
    diff = sanitized.sanitizedSnippet;
  }

  const rawSnippetSecretMatch = (finding.location.snippet || "").match(
    /(sk-[a-zA-Z0-9_-]{20,}|eyJ[a-zA-Z0-9_-]{20,})/
  );
  if (rawSnippetSecretMatch) {
    const rawVal = rawSnippetSecretMatch[0];
    diff = diff.split(rawVal).join("process.env.API_SECRET");
    patched = patched.split(rawVal).join("process.env.API_SECRET");
  }

  const syntaxCheck = validateCodeSyntax(patched, filePath);

  const slug = finding.ruleId.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const shortId = finding.id.slice(0, 8);
  const branchName = `wren/fix-${slug}-${shortId}`;

  const title = `fix(security): resolve ${finding.title} [${finding.ruleId}]`;
  const explanation = `${finding.plainEnglishExplanation}\n\n**Remediation Details:**\n${finding.fix.description}\n\n*Note: Secrets have been abstracted into environment variables. Ensure the appropriate secret value is supplied to your deployment environment without committing it to source control.*`;

  return {
    isValid: syntaxCheck.isValid,
    error: syntaxCheck.error,
    patchedContent: patched,
    diff,
    branchName,
    title,
    explanation,
    filePath,
  };
}
