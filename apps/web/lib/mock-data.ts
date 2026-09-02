export interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "Secret Leak" | "Authentication" | "Database Security" | "Configuration";
  file: string;
  line: number;
  snippet: string;
  suggestedFix: string;
  explanation: string;
}

export interface ScanReport {
  id: string;
  repo: string;
  branch: string;
  commitHash: string;
  commitMessage: string;
  scannedAt: string;
  durationMs: number;
  status: "completed" | "failed" | "running";
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    totalFiles: number;
    linesOfCode: number;
  };
  findings: Finding[];
}

export const MOCK_SCANS: ScanReport[] = [
  {
    id: "scan-9021",
    repo: "acme-corp/vibe-crm",
    branch: "main",
    commitHash: "e4f81a2",
    commitMessage: "feat: add ai email summaries and firestore sync",
    scannedAt: "2026-08-29T14:32:10Z",
    durationMs: 1420,
    status: "completed",
    summary: {
      critical: 2,
      high: 1,
      medium: 1,
      low: 0,
      totalFiles: 48,
      linesOfCode: 3820,
    },
    findings: [
      {
        id: "find-01",
        title: "Hardcoded OpenAI Secret Key Exposed in Client Bundle",
        severity: "critical",
        category: "Secret Leak",
        file: "src/app/api/summarize/route.ts",
        line: 14,
        snippet: `const openai = new OpenAI({\n  apiKey: "sk-proj-9xLkM39294029482049284029482048204928402948204820",\n});`,
        suggestedFix: `const openai = new OpenAI({\n  apiKey: process.env.OPENAI_API_KEY,\n});`,
        explanation: "API keys committed directly in source code or client-accessible files will leak to the browser network tab and repository history, risking severe financial drain or unauthorized API usage."
      },
      {
        id: "find-02",
        title: "Unprotected Firestore Write Rule Allows Public Modification",
        severity: "critical",
        category: "Database Security",
        file: "firestore.rules",
        line: 8,
        snippet: `match /users/{userId} {\n  allow read, write: if true;\n}`,
        suggestedFix: `match /users/{userId} {\n  allow read, write: if request.auth != null && request.auth.uid == userId;\n}`,
        explanation: "This rule enables unauthenticated users to overwrite or delete arbitrary user profile records directly from the client."
      },
      {
        id: "find-03",
        title: "Server Action Lacks Session Verification",
        severity: "high",
        category: "Authentication",
        file: "src/actions/delete-workspace.ts",
        line: 22,
        snippet: `export async function deleteWorkspace(workspaceId: string) {\n  await db.workspace.delete({ where: { id: workspaceId } });\n}`,
        suggestedFix: `export async function deleteWorkspace(workspaceId: string) {\n  const session = await auth();\n  if (!session?.user?.id) throw new Error("Unauthorized");\n  await db.workspace.delete({\n    where: { id: workspaceId, ownerId: session.user.id }\n  });\n}`,
        explanation: "The server action receives an ID directly from the client without verifying whether the currently logged-in user has authorization to delete this workspace."
      },
      {
        id: "find-04",
        title: "Supabase Row-Level Security (RLS) Disabled on 'leads' Table",
        severity: "medium",
        category: "Database Security",
        file: "supabase/migrations/20260815_init.sql",
        line: 45,
        snippet: `CREATE TABLE public.leads (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email TEXT NOT NULL\n);`,
        suggestedFix: `ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Users can only view their organization leads"\n  ON public.leads FOR SELECT\n  USING (auth.uid() = org_id);`,
        explanation: "Tables without active RLS policies can be queried directly via Supabase PostgREST client if anon key has permissions."
      }
    ]
  },
  {
    id: "scan-8812",
    repo: "acme-corp/bolt-storefront",
    branch: "feat/checkout",
    commitHash: "9a21b44",
    commitMessage: "fix: stripe webhook handler",
    scannedAt: "2026-08-28T18:15:00Z",
    durationMs: 890,
    status: "completed",
    summary: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 2,
      totalFiles: 32,
      linesOfCode: 2190,
    },
    findings: [
      {
        id: "find-05",
        title: "Stripe Webhook Signature Verification Bypassed",
        severity: "high",
        category: "Authentication",
        file: "app/api/webhooks/stripe/route.ts",
        line: 31,
        snippet: `const event = JSON.parse(body);\n// stripe.webhooks.constructEvent skipped for local dev`,
        suggestedFix: `const event = stripe.webhooks.constructEvent(\n  body,\n  signature,\n  process.env.STRIPE_WEBHOOK_SECRET!\n);`,
        explanation: "Skipping signature verification permits malicious actors to forge payment success events and trigger fulfillment without real payment."
      }
    ]
  }
];

export const SCAN_METRICS = {
  totalRepos: 12,
  scansRun: 148,
  activeVulnerabilities: 3,
  remediatedIssues: 28,
};

export const MOCK_VULNERABILITY_TYPES = [
  { name: "Secret Leaks", count: 14, color: "#ef4444" },
  { name: "Missing Auth Checks", count: 9, color: "#f97316" },
  { name: "Unsafe DB Rules", count: 8, color: "#eab308" },
  { name: "Insecure CORS / Headers", count: 4, color: "#06b6d4" },
];

export const MOCK_PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "For local scans",
    priceMonthly: 0,
    priceYearly: 0,
    period: "/mo",
    badge: "No card required",
    ctaLabel: "Get started",
    ctaHref: "/login",
    features: [
      "10 scans per month",
      "Local CLI",
      "Email support"
    ],
    highlight: false
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious projects",
    priceMonthly: 19,
    priceYearly: 190,
    period: "/mo",
    badge: "or $190 yearly",
    ctaLabel: "Get started",
    ctaHref: "/login",
    features: [
      "Unlimited scans",
      "GitHub Action integration",
      "Priority support"
    ],
    highlight: true
  },
  {
    id: "team",
    name: "Team",
    tagline: "For teams",
    priceMonthly: 49,
    priceYearly: 490,
    period: "/mo",
    badge: "or $490 yearly",
    ctaLabel: "Get started",
    ctaHref: "/login",
    features: [
      "Multiple seats",
      "Shared dashboard",
      "Everything in Pro"
    ],
    highlight: false
  }
];

export const MOCK_CHANGELOG = [
  {
    version: "v0.4.0",
    date: "Aug 2026",
    title: "GitHub Action Integration & Improved Reason Pass",
    description: "Added GitHub Action integration. Improved false-positive filtering in the Reason pass with AST graph context.",
    changes: [
      "GitHub Action `@wren/action@v1` for automated CI/CD scans on pull requests.",
      "Enhanced Reason LLM engine reduces false-positive rates on template strings by 64%.",
      "New JSON and SARIF export formats for GitHub Code Scanning tab."
    ]
  },
  {
    version: "v0.3.0",
    date: "Jul 2026",
    title: "Database Rule Checks for Firestore & Supabase",
    description: "Added database rule checks for Firestore and Supabase security rules.",
    changes: [
      "Static analyzer for `firestore.rules` evaluating read/write permission scopes.",
      "Supabase PostgreSQL RLS checker identifying unprotected tables and wide-open policies.",
      "Custom severity thresholds configuration via `.wrenrc.json`."
    ]
  },
  {
    version: "v0.2.0",
    date: "Jun 2026",
    title: "Expanded Secret & API Key Detection",
    description: "Added API key detection across more file types and AI-generated code patterns.",
    changes: [
      "Secret scanning covering 40+ popular providers (OpenAI, Anthropic, Supabase, Stripe, Resend, AWS).",
      "Next.js App Router route handler and Server Action vulnerability heuristics.",
      "Interactive CLI reporter with syntax-highlighted code diffs."
    ]
  }
];
