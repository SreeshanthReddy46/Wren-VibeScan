import type { Finding } from "@wren/shared-types";
import type { DiscoveredFile } from "./file-discovery";
import * as fs from "fs";

export function runAstScan(files: DiscoveredFile[]): Finding[] {
  const findings: Finding[] = [];
  let findingCounter = 1;

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file.absolutePath, "utf8");
    } catch {
      continue;
    }

    const relPath = file.relativePath.toLowerCase();

    if (
      (relPath.includes("api/") || relPath.includes("routes/")) &&
      (relPath.endsWith("route.ts") || relPath.endsWith("route.js"))
    ) {
      const hasMutatingHandler =
        /export\s+(?:async\s+)?function\s+(?:POST|DELETE|PUT|PATCH)\b/.test(content);

      if (hasMutatingHandler) {

        const hasAuthCheck =
          /auth\(|getSession|getServerSession|currentUser|requireAuth|createClient.*auth|supabase\.auth\.getUser/i.test(
            content
          );

        if (!hasAuthCheck) {
          const lines = content.split(/\r?\n/);
          let handlerLine = 1;
          for (let i = 0; i < lines.length; i++) {
            if (/export\s+(?:async\s+)?function\s+(?:POST|DELETE|PUT|PATCH)\b/.test(lines[i])) {
              handlerLine = i + 1;
              break;
            }
          }

          findings.push({
            id: `ast-finding-${Date.now()}-${findingCounter++}`,
            ruleId: "WREN-AUTH-001",
            category: "auth",
            severity: "high",
            title: "Route Handler Missing Authentication Check",
            message: "This mutating API endpoint accepts POST/DELETE/PUT without verifying the user's session.",
            plainEnglishExplanation:
              "AI code generators frequently generate database deletion or update endpoints without verifying caller identity. Any anonymous attacker can make HTTP requests to wipe or tamper with data.",
            cwe: "CWE-306",
            location: {
              filePath: file.relativePath,
              startLine: handlerLine,
              endLine: handlerLine,
              snippet: lines[handlerLine - 1]?.trim() || "export async function POST...",
            },
            fix: {
              description: "Verify authenticated user session at the start of the handler",
              replacementCode: `const { data: { user }, error } = await supabase.auth.getUser();\nif (!user || error) {\n  return new Response("Unauthorized", { status: 401 });\n}`,
              diff: `+ const session = await auth();\n+ if (!session?.user) return new Response("Unauthorized", { status: 401 });`,
            },
            isAiGeneratedPattern: true,
          });
        }
      }
    }

    if (
      (file.extension === ".tsx" || file.extension === ".jsx" || file.extension === ".ts") &&
      content.includes('"use client"')
    ) {
      if (/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(content)) {
        const lines = content.split(/\r?\n/);
        let leakLine = 1;
        for (let i = 0; i < lines.length; i++) {
          if (/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(lines[i])) {
            leakLine = i + 1;
            break;
          }
        }

        findings.push({
          id: `ast-finding-${Date.now()}-${findingCounter++}`,
          ruleId: "WREN-AUTH-002",
          category: "auth",
          severity: "critical",
          title: "Supabase Service Role Key Used in Client Component",
          message: "A bypass-all Supabase service role key is referenced in a client component.",
          plainEnglishExplanation:
            "The Supabase service role key bypasses all Row Level Security (RLS) policies. Using it in client-side code exposes it directly in the browser, allowing any visitor full read/write admin access to your entire database.",
          cwe: "CWE-285",
          location: {
            filePath: file.relativePath,
            startLine: leakLine,
            endLine: leakLine,
            snippet: lines[leakLine - 1]?.trim() || "",
          },
          fix: {
            description: "Move admin operations to a server route or use the anon public key with RLS",
            replacementCode: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`,
            diff: `- createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)\n+ createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)`,
          },
          isAiGeneratedPattern: true,
        });
      }
    }

    if (relPath.endsWith(".rules") || relPath.includes("firestore")) {
      const openRuleRegex = /allow\s+(?:read,\s*write|write|create|update|delete)\s*:\s*if\s+true\s*;/g;
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        if (openRuleRegex.test(lines[i])) {
          findings.push({
            id: `ast-finding-${Date.now()}-${findingCounter++}`,
            ruleId: "WREN-DB-003",
            category: "database",
            severity: "critical",
            title: "Database Rules Permitting Unrestricted Public Access",
            message: "Database rules allow unrestricted read/write access ('if true;').",
            plainEnglishExplanation:
              "AI assistants frequently default Firebase rules to 'allow read, write: if true;' during development so everything works immediately. If deployed to production, anyone on the internet can read or delete your database.",
            cwe: "CWE-276",
            location: {
              filePath: file.relativePath,
              startLine: i + 1,
              endLine: i + 1,
              snippet: lines[i].trim(),
            },
            fix: {
              description: "Require authenticated user ID match for write access",
              replacementCode: "allow read, write: if request.auth != null;",
              diff: `- ${lines[i].trim()}\n+ allow read, write: if request.auth != null;`,
            },
            isAiGeneratedPattern: true,
          });
        }
      }
    }

    if (content.includes("Access-Control-Allow-Origin") && content.includes('"*"')) {
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Access-Control-Allow-Origin") && lines[i].includes("*")) {
          findings.push({
            id: `ast-finding-${Date.now()}-${findingCounter++}`,
            ruleId: "WREN-CONF-001",
            category: "configuration",
            severity: "medium",
            title: "Permissive CORS Wildcard Header",
            message: "Endpoint allows any origin ('*') to send cross-origin requests.",
            plainEnglishExplanation:
              "Setting Access-Control-Allow-Origin to '*' allows arbitrary third-party websites to make requests to this endpoint on behalf of unsuspecting visitors.",
            cwe: "CWE-346",
            location: {
              filePath: file.relativePath,
              startLine: i + 1,
              endLine: i + 1,
              snippet: lines[i].trim(),
            },
            fix: {
              description: "Restrict allowed origin to specific production domains",
              replacementCode: `'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://yourdomain.com'`,
              diff: `- 'Access-Control-Allow-Origin': '*'\n+ 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN`,
            },
            isAiGeneratedPattern: false,
          });
        }
      }
    }
  }

  return findings;
}
