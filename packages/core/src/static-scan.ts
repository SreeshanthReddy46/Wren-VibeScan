import type { Finding } from "@wren/shared-types";
import type { DiscoveredFile } from "./file-discovery";
import * as fs from "fs";

interface StaticRule {
  id: string;
  category: Finding["category"];
  severity: Finding["severity"];
  title: string;
  message: string;
  explanation: string;
  pattern: RegExp;
  cwe?: string;
  fixGenerator: (match: string, fullLine: string) => { description: string; replacementCode: string };
}

const STATIC_RULES: StaticRule[] = [
  {
    id: "WREN-SEC-001",
    category: "secret",
    severity: "critical",
    title: "Hardcoded OpenAI Secret Key Exposed",
    message: "An active OpenAI secret key (sk-...) is committed in plaintext in this file.",
    explanation:
      "AI coding assistants frequently paste raw OpenAI keys directly into source files. Anyone who inspects the file or bundle can extract your key and exhaust your billing quota.",
    pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/g,
    cwe: "CWE-798",
    fixGenerator: (_match, fullLine) => ({
      description: "Replace raw key with process.env.OPENAI_API_KEY",
      replacementCode: fullLine.replace(/["']sk-(?:proj-)?[A-Za-z0-9_-]{32,}["']/, "process.env.OPENAI_API_KEY"),
    }),
  },
  {
    id: "WREN-SEC-002",
    category: "secret",
    severity: "critical",
    title: "Live Stripe Secret Key Exposed",
    message: "A live Stripe secret key (sk_live_...) is hardcoded in the codebase.",
    explanation:
      "Stripe live keys allow full programmatic access to charge credit cards, issue refunds, and read customer PII. They must strictly live in private server environment variables.",
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    cwe: "CWE-798",
    fixGenerator: (_match, fullLine) => ({
      description: "Load Stripe key securely from environment variable",
      replacementCode: fullLine.replace(/["']sk_live_[0-9a-zA-Z]{24,}["']/, "process.env.STRIPE_SECRET_KEY"),
    }),
  },
  {
    id: "WREN-SEC-003",
    category: "secret",
    severity: "critical",
    title: "Anthropic Claude API Key Exposed",
    message: "An Anthropic API key (sk-ant-...) is hardcoded in plaintext.",
    explanation:
      "Claude API keys must never be committed. Anyone with access can make unauthorized model completions on your billing account.",
    pattern: /sk-ant-[0-9a-zA-Z_-]{30,}/g,
    cwe: "CWE-798",
    fixGenerator: (_match, fullLine) => ({
      description: "Reference ANTHROPIC_API_KEY from environment variables",
      replacementCode: fullLine.replace(/["']sk-ant-[0-9a-zA-Z_-]{30,}["']/, "process.env.ANTHROPIC_API_KEY"),
    }),
  },
  {
    id: "WREN-SEC-004",
    category: "secret",
    severity: "critical",
    title: "AWS Access Key ID Hardcoded",
    message: "An AWS access key identifier (AKIA...) is embedded in the source.",
    explanation:
      "Committed AWS credentials can lead to immediate infrastructure compromise and massive compute hijacking (e.g. crypto-mining instances).",
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    cwe: "CWE-798",
    fixGenerator: (_match, fullLine) => ({
      description: "Use AWS IAM roles or AWS_ACCESS_KEY_ID environment variable",
      replacementCode: fullLine.replace(/["'](?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}["']/, "process.env.AWS_ACCESS_KEY_ID"),
    }),
  },
  {
    id: "WREN-SEC-005",
    category: "secret",
    severity: "critical",
    title: "GitHub Personal Access Token Hardcoded",
    message: "A plaintext GitHub access token was discovered.",
    explanation:
      "Leaked personal access tokens allow attackers to read private repositories, modify workflows, and push malicious code.",
    pattern: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[0-9a-zA-Z_]{36,}/g,
    cwe: "CWE-798",
    fixGenerator: (_match, fullLine) => ({
      description: "Read GitHub token from GITHUB_TOKEN environment variable",
      replacementCode: fullLine.replace(/["'](?:ghp|gho|ghu|ghs|ghr|github_pat)_[0-9a-zA-Z_]{36,}["']/, "process.env.GITHUB_TOKEN"),
    }),
  },
  {
    id: "WREN-DB-001",
    category: "database",
    severity: "critical",
    title: "Production Database Connection String Committed",
    message: "A raw database connection URI with embedded credentials was found.",
    explanation:
      "Database URIs contain database username and password in plaintext. Anyone with network access to the database host can wipe or dump your tables.",
    pattern: /(?:postgres|postgresql|mysql|mongodb\+srv|redis):\/\/[a-zA-Z0-9_]+:[^@\s"']+@[a-zA-Z0-9_.-]+(?::[0-9]+)?\/[a-zA-Z0-9_.-]+/g,
    cwe: "CWE-312",
    fixGenerator: (_match, fullLine) => ({
      description: "Replace with DATABASE_URL environment variable",
      replacementCode: fullLine.replace(/["'](?:postgres|postgresql|mysql|mongodb\+srv|redis):\/\/[^"']+["']/, "process.env.DATABASE_URL"),
    }),
  },
  {
    id: "WREN-SEC-006",
    category: "secret",
    severity: "high",
    title: "Secret Inadvertently Prefixed with NEXT_PUBLIC_",
    message: "A sensitive key appears to use NEXT_PUBLIC_, leaking it into the client-side browser bundle.",
    explanation:
      "In Next.js, any environment variable prefixed with NEXT_PUBLIC_ is inlined into the client JavaScript bundle. Private keys or service role tokens must never have this prefix.",
    pattern: /NEXT_PUBLIC_(?:.*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|TOKEN|PASSWORD).*)\s*=\s*["'][^"']+["']/gi,
    cwe: "CWE-200",
    fixGenerator: (_match, fullLine) => ({
      description: "Remove NEXT_PUBLIC_ prefix so variable remains server-only",
      replacementCode: fullLine.replace(/NEXT_PUBLIC_/, ""),
    }),
  },
];

export function runStaticScan(files: DiscoveredFile[]): Finding[] {
  const findings: Finding[] = [];
  let findingCounter = 1;

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file.absolutePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip comment-only lines
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) {
        continue;
      }

      for (const rule of STATIC_RULES) {
        // Reset regex state
        rule.pattern.lastIndex = 0;
        const match = rule.pattern.exec(line);

        if (match) {
          const matchedSecret = match[0];
          const fix = rule.fixGenerator(matchedSecret, line);

          findings.push({
            id: `finding-${Date.now()}-${findingCounter++}`,
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            title: rule.title,
            message: rule.message,
            plainEnglishExplanation: rule.explanation,
            cwe: rule.cwe,
            location: {
              filePath: file.relativePath,
              startLine: lineIndex + 1,
              endLine: lineIndex + 1,
              startColumn: match.index + 1,
              endColumn: match.index + matchedSecret.length + 1,
              snippet: line.trim(),
            },
            fix: {
              description: fix.description,
              replacementCode: fix.replacementCode.trim(),
              diff: `- ${line.trim()}\n+ ${fix.replacementCode.trim()}`,
            },
            isAiGeneratedPattern: true,
          });
        }
      }
    }
  }

  return findings;
}
