# Wren 🦅

> **Enterprise-grade security scanning & autonomous remediation for AI-generated code — from your terminal to production runtime.**  
> Catch and fix what Cursor, Lovable, Bolt, and v0 leave behind — before it reaches your users.

[![npm version](https://img.shields.io/npm/v/wren-security.svg?style=flat-square&color=0284c7)](https://www.npmjs.com/package/wren-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://img.shields.io/github/actions/workflow/status/SreeshanthReddy46/Wren-VibeScan/ci.yml?branch=main&style=flat-square)](https://github.com/SreeshanthReddy46/Wren-VibeScan/actions)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-ef4444.svg?style=flat-square)](https://turbo.build/repo)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg?style=flat-square)](https://pnpm.io)

---

## What is Wren?

Wren is a comprehensive security platform designed specifically for the AI coding era. Modern AI coding assistants prioritize speed and making UI components render immediately, frequently leaving behind critical security vulnerabilities:
- **Exposed API keys & secrets** (`sk-...`, `sk_live_...`, database credentials)
- **Unauthenticated route handlers** (`POST`/`PUT`/`DELETE` endpoints lacking session or authorization checks)
- **Client-side leaked admin credentials** (`NEXT_PUBLIC_` prefixes on private tokens, Supabase service role keys)
- **Permissive database security rules** (`allow read, write: if true;`)
- **Runtime Agent Threat Exposures** (Unsanctioned destructive tool calls, privilege escalations, financial/PII leakage in arguments)

Wren combines sub-second AST parsing, autonomous multi-step agent verification, dual-tier memory caching, one-click patch remediation, and live production runtime agent auditing into a single unified platform.

---

## Core Capabilities

```
                                    ┌─────────────────────────────────────────┐
                                    │               Wren Engine               │
                                    └────────────────────┬────────────────────┘
                                                         │
         ┌───────────────────────────────┬───────────────┴───────────────┬───────────────────────────────┐
         ▼                               ▼                               ▼                               ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   Static & AST   │           │    Autonomous    │           │    Dual-Tier     │           │     Runtime      │
│     Scanner      │           │   Agent Loop     │           │   Agent Memory   │           │  Agent Auditing  │
│ Sub-second rules │           │ Multi-step tools │           │ AST Hash +       │           │ Live event stream│
│ & SARIF exports  │           │ & Critic rubric  │           │ pgvector sematic │           │ & HMAC webhooks  │
└────────┬─────────┘           └────────┬─────────┘           └────────┬─────────┘           └────────┬─────────┘
         │                              │                              │                              │
         └──────────────────────────────┼──────────────────────────────┴──────────────────────────────┘
                                        ▼
                       ┌──────────────────────────────────┐
                       │   Autonomous Remediation Agent   │
                       │    AST Validated Code Patches    │
                       │   wren fix & GitHub App PRs      │
                       └──────────────────────────────────┘
```

### 1. Fast Static & AST Scanner
- Local static and AST analysis runs in milliseconds with zero remote code uploads.
- Specialized heuristic rules targeting AI-generated code vulnerabilities.
- Native SARIF 2.1.0 output for seamless GitHub Code Scanning and Security Tab integration.

### 2. Autonomous Agentic Reasoning & Critic Loop
- **Multi-step codebase investigation**: When LLM reasoning is enabled, an autonomous agent inspects call hierarchies, sanitizers, and middleware using sandboxed codebase tools (`ripgrep`, `ast-grep`, file discovery).
- **Adversarial Critic Judge**: Every finding is evaluated against a strict rubric (`evidenceQuality`, `falsePositiveRisk`, `confidenceScore`) with overrule protection to eliminate false positives before alerting.
- **Trace Observability**: Full execution span metrics and reasoning steps persisted to local disk and visible in the web dashboard trace drawer.

### 3. Dual-Tier Cross-Scan Agent Memory
- **Tier 1 (Instant Local Hash)**: Normalized AST structural hashing checks prior scan verdicts in `<1ms` without making any network calls.
- **Tier 2 (Semantic Supabase `pgvector`)**: Matches semantically similar vulnerabilities across scans using vector embeddings.
- **Zero-Leakage Privacy Anonymization**: Automatically redacts secrets, credentials, emails, and absolute paths before pattern storage.

### 4. Event-Driven Asynchronous Lifecycle
- Asynchronous durable scans powered by **Inngest** workflows (`execute-scan`).
- Instant CLI dispatch with `--async` flag, returning a scan tracking ID and progress status.
- Real-time finding streaming to the browser via **Supabase Realtime** (`useScanRealtime`).

### 5. Autonomous Remediation Agent (`wren fix`)
- Automatic patch generation with AST syntax validation to guarantee generated diffs never introduce syntax errors.
- **CLI Remediation**: Run `wren-security fix [findingId]` with `--dry-run`, `--apply-locally`, or `--open-pr`.
- **GitHub App PR Dispatch**: Automatically generates isolated remediation branches and opens pull requests directly from the web dashboard.

### 6. Runtime Agent Auditing & Threat Detection (v2.0)
- Dedicated `/api/v1/agent-events` endpoint to ingest real-time action logs from customer production AI agents.
- High-performance threat rules engine (<1ms evaluation):
  - **`WREN-RUN-001`**: Unsanctioned destructive operation (`delete_user`, `drop_database`).
  - **`WREN-RUN-002`**: Unauthorized privilege escalation (assigning `admin`/`superuser` roles).
  - **`WREN-RUN-003`**: Active API keys or tokens leaked into tool arguments.
  - **`WREN-RUN-004`**: Unmasked financial data or private keys exposed in action parameters.
- Cryptographic **HMAC-SHA256** webhook notification dispatcher with replay attack tolerance windows.
- Dedicated Live Audit Stream (`/audit`) and Webhook Configuration UI (`/settings/webhooks`).

---

## Monorepo Architecture

This repository is organized as a **Turborepo** + **pnpm workspace** monorepo:

```
wren/
├── apps/
│   └── web/                    # Next.js 15 web app — marketing, dashboard, audit stream & APIs
│       ├── app/                # App Router (21 production routes)
│       │   ├── (auth)/         # Supabase / Google OAuth auth pages
│       │   ├── (marketing)/    # Animated landing, pricing, changelog
│       │   ├── audit/          # Real-time runtime agent audit log
│       │   ├── scans/[id]/     # Scan detail view with trace drawer & fix modals
│       │   ├── settings/       # Repository opt-in & webhook destination management
│       │   └── api/            # Scans, traces, remediations, agent-events & webhooks
│       ├── components/         # Radix UI, Framer Motion, trace drawer & remediation modal
│       ├── inngest/            # Background functions for scans, remediations, and audits
│       └── lib/                # Database schemas (SQL) and dispatchers
│
├── packages/
│   ├── cli/                    # Published npm package "wren-security"
│   │   ├── src/commands/       # check (async), fix, init, login, logout
│   │   └── src/report/         # Terminal, JSON, and SARIF formatters
│   ├── core/                   # Scan, agent, memory, remediation & runtime engine
│   │   ├── src/agent/          # Planner, investigator, verifier, reporter, critic, tracer
│   │   ├── src/memory/         # Dual-tier pgvector + AST structural hash store
│   │   ├── src/remediation/    # Patch generator & AST syntax validator
│   │   └── src/runtime/        # Threat rules engine & HMAC webhook signer
│   ├── shared-types/           # Shared TypeScript domain contracts
│   └── config/                 # Base tsconfig configurations
│
├── docs/superpowers/           # Architectural design specs & execution plans
├── turbo.json                  # Turborepo task pipelines
└── pnpm-workspace.yaml         # pnpm workspace configuration
```

---

## Quick Start (Zero Install)

Scan your current codebase instantly using `npx`:

```bash
npx wren-security check .
```

Automatically fix flagged vulnerabilities:

```bash
npx wren-security fix --dry-run
```

Or install globally:

```bash
npm install -g wren-security
wren-security check
```

---

## CLI Commands & Options

### 1. `wren-security check [path]` (Aliases: `wren-security`, `wren-security scan`)

Scans your files for AI-generated security vulnerabilities.

```bash
# Scan current directory
wren-security check

# Scan a specific folder
wren-security check ./src

# Asynchronous background scan with real-time status
wren-security check --async

# Exit with code 1 if critical issues exist (for CI/CD pipelines)
wren-security check --fail-on-critical

# Fail on high or critical issues
wren-security check --fail-on high

# Export to SARIF for GitHub Security Tab
wren-security check --format sarif -o results.sarif

# Export as JSON report
wren-security check --format json -o wren-report.json

# Enable autonomous agentic LLM investigation
wren-security check --llm
```

| Flag | Type | Description | Default |
|---|---|---|---|
| `[path]` | `string` | Target directory to scan | `.` (current dir) |
| `--async` | `boolean` | Dispatch scan to background queue and stream progress | `false` |
| `--fail-on-critical` | `boolean` | Exit code `1` if critical findings are found | `false` |
| `--fail-on <severity>`| `string` | Exit code `1` if findings at or above threshold exist (`critical`, `high`, `medium`) | — |
| `--format <format>` | `string` | Output format: `terminal`, `json`, or `sarif` | `terminal` |
| `--llm` | `boolean` | Enrich findings with contextual LLM reasoning & agent loop | `false` |
| `-o, --output <file>` | `string` | Write report output directly to a file | stdout |
| `--api-key <key>` | `string` | Wren Cloud or Anthropic API key | — |
| `-v, --version` | `boolean` | Display version number | — |
| `-h, --help` | `boolean` | Show help and options | — |

---

### 2. `wren-security fix [findingId]`

Generates an AST-verified remediation patch and applies it or opens a GitHub Pull Request.

```bash
# Preview proposed unified diff patch without touching disk
wren-security fix --dry-run

# Apply verified patch directly to local disk
wren-security fix --apply-locally

# Fix a specific finding ID
wren-security fix hardcoded-secret-abc123 --apply-locally

# Dispatch an isolated branch and Pull Request via GitHub App
wren-security fix --open-pr --repo owner/repo
```

| Flag | Type | Description | Default |
|---|---|---|---|
| `[findingId]` | `string` | ID of the finding to remediate | First finding |
| `--dry-run` | `boolean` | Preview unified diff patch without writing to disk | `false` |
| `--apply-locally` | `boolean` | Apply verified patch directly to the target file on disk | `false` |
| `--open-pr` | `boolean` | Create a branch and open a GitHub Pull Request | `false` |
| `--repo <owner/repo>`| `string` | Target GitHub repository (auto-detected from git remote) | Local remote |
| `--api-url <url>` | `string` | Custom Wren Cloud API endpoint | `http://localhost:3000` |

---

### 3. Configuration & Auth Commands

```bash
# Generate .wrenignore and .wrenrc.json configuration files
wren-security init

# Authenticate CLI with your Wren Cloud dashboard
wren-security login <token>

# Remove stored local credentials
wren-security logout
```

---

## Runtime Agent Auditing API (v2.0)

Wren provides an ingestion and threat monitoring pipeline for customer production AI agents:

### Ingest Agent Actions
```http
POST /api/v1/agent-events HTTP/1.1
Host: api.wrensecurity.io
Content-Type: application/json

{
  "agentId": "customer-support-agent-v1",
  "sessionId": "sess-98213",
  "environment": "production",
  "action": "delete_user",
  "declaredIntent": "User requested account deletion",
  "arguments": {
    "userId": "usr-12345"
  }
}
```
**Response**: `202 Accepted` with evaluated threat verdict and triggered rule list.

### Webhook Signatures
Alert notifications dispatch HMAC-SHA256 signed payloads to configured webhook endpoints with replay attack defense:
```
X-Wren-Signature: t=1757073600,v1=9f83...6a12
```

---

## Development & Monorepo Workflows

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 10.0.0

### Getting Started

```bash
# Clone the repository
git clone https://github.com/SreeshanthReddy46/Wren-VibeScan.git
cd Wren-VibeScan

# Install dependencies across all workspace packages
pnpm install

# Start development servers (Next.js app on :3000 + watch mode for packages)
pnpm dev

# Build all packages with Turborepo caching
pnpm build

# Run typecheck across all workspace projects
pnpm typecheck

# Run test suites across core and CLI packages
pnpm --filter @wren/core test
pnpm --filter wren-security test
```

---

## License

[MIT](LICENSE) © Wren Security
