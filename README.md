# Wren 🦅

> **Enterprise-grade security scanning & autonomous remediation for AI-generated code — from your terminal to production runtime.**  
> Catch and fix what Cursor, Lovable, Bolt, and v0 leave behind — before it reaches your users.

[![npm version](https://img.shields.io/npm/v/wren-security.svg?style=flat-square&color=0284c7)](https://www.npmjs.com/package/wren-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://img.shields.io/github/actions/workflow/status/SreeshanthReddy46/Wren-VibeScan/ci.yml?branch=main&style=flat-square)](https://github.com/SreeshanthReddy46/Wren-VibeScan/actions)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-ef4444.svg?style=flat-square)](https://turbo.build/repo)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg?style=flat-square)](https://pnpm.io)

---

## What's New in Wren 3.0

- 🔍 **Live Investigation View**: Transparent multi-step agent reasoning streamed live to your terminal:
  ```text
  ⠋ Investigating /api/users/[id]
    → read_file  app/api/users/[id]/route.ts
    → search     "requireAuth"  (0 matches)
    → verdict    HIGH · no auth check in any call path
  ```
- 🔧 **Interactive `wren fix` with Diff Preview**: Review proposed unified diff patches and confirm interactively (`[y/n/q]`). Nothing is ever applied silently. Supports `--yes` / `-y` for automated CI/CD pipelines.
- 👀 **Incremental Watch Mode (`wren watch`)**: Automatically monitors your workspace and re-scans modified files on save with a live dashboard.
- 🧠 **Structured Ignore Memory (`.wren/ignore.json`)**: Persistent ignore records with explicit reasons so false positives never nag twice. Automatically migrates legacy `.wrenignore` files.
- 🖥️ **Full-Screen Interactive Terminal UI**: Run `wren` without arguments in any interactive terminal for split-pane navigation, tabbed detail views, and one-key ignores.

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

### 2. Deep Reasoning Mode with Live Investigation Stream
- **Multi-step codebase investigation**: When `--llm` is enabled, an autonomous agent inspects call hierarchies, sanitizers, and middleware before finalizing verdicts.
- **Transparent Investigation Stream**: Watch each step of the agent's reasoning in real time directly in your terminal.
- **Strictly Read-Only Guarantee**: Three dedicated sandboxed tools (`read_file`, `search_codebase`, `get_call_sites`) allow inspection without any capability to write, modify, execute, or delete files.
- **Bounded Cost & Safe Fallback**: Capped at 5 tool calls per finding. Ambiguous findings reaching the limit are flagged for manual review with detailed traces stored in `agent_traces`.
- **Adversarial Critic Judge**: Every finding is evaluated against a strict rubric (`evidenceQuality`, `falsePositiveRisk`, `confidenceScore`) with overrule protection to eliminate false positives before alerting.

### 3. Dual-Tier Cross-Scan Agent Memory
- **Tier 1 (Instant Local Hash)**: Normalized AST structural hashing checks prior scan verdicts in `<1ms` without making any network calls.
- **Tier 2 (Semantic Supabase `pgvector`)**: Matches semantically similar vulnerabilities across scans using vector embeddings.
- **Zero-Leakage Privacy Anonymization**: Automatically redacts secrets, credentials, emails, and absolute paths before pattern storage.

### 4. Interactive Remediation & Watch Mode
- **Interactive Patch Confirmation**: Colored unified diff preview with confirmation prompt (`[y/n/q]`).
- **Incremental Watch Mode**: Re-scans modified files on save with a live dashboard.
- **GitHub App PR Dispatch**: Automatically generates isolated remediation branches and opens pull requests directly from the web dashboard.

### 5. Runtime Agent Auditing & Threat Detection
- Dedicated `/api/v1/agent-events` endpoint to ingest real-time action logs from customer production AI agents.
- High-performance threat rules engine (<1ms evaluation):
  - **`WREN-RUN-001`**: Unsanctioned destructive operation (`delete_user`, `drop_database`).
  - **`WREN-RUN-002`**: Unauthorized privilege escalation (assigning `admin`/`superuser` roles).
  - **`WREN-RUN-003`**: Active API keys or tokens leaked into tool arguments.
  - **`WREN-RUN-004`**: Unmasked financial data or private keys exposed in action parameters.
- Cryptographic **HMAC-SHA256** webhook notification dispatcher with replay attack tolerance windows.

---

## Quick Start (Zero Install)

Scan your current codebase instantly using `npx`:

```bash
npx wren-security check .
```

Or launch the full-screen interactive Terminal UI:

```bash
npx wren-security
```

Or install globally:

```bash
npm install -g wren-security
wren-security check
```

---

## CLI Commands & Options

### 1. `wren-security check [path]` (or `wren check`)

Scans your files for security vulnerabilities:

```bash
wren-security check
wren-security check ./src
wren-security check --fail-on-critical
wren-security check --fail-on high
wren-security check --format sarif -o results.sarif
wren-security check --format json -o wren-report.json
wren-security check --llm
wren-security check --async
```

| Flag | Type | Description | Default |
|---|---|---|---|
| `[path]` | `string` | Target directory to scan | `.` (current dir) |
| `--async` | `boolean` | Dispatch scan to background queue and stream progress | `false` |
| `--fail-on-critical` | `boolean` | Exit code `1` if critical findings are found | `false` |
| `--fail-on <severity>`| `string` | Exit code `1` if findings at or above threshold exist (`critical`, `high`, `medium`) | — |
| `--format <format>` | `string` | Output format: `terminal`, `table`, `json`, or `sarif` | `terminal` |
| `--llm` | `boolean` | Enable multi-step Deep Reasoning investigation with live terminal steps | `false` |
| `-o, --output <file>` | `string` | Write report output directly to a file | stdout |
| `-q, --quiet` | `boolean` | Suppress spinners and non-essential progress output | `false` |
| `--api-key <key>` | `string` | Wren Cloud or Anthropic API key | — |
| `-v, --version` | `boolean` | Display version number | — |
| `-h, --help` | `boolean` | Show help and options | — |

---

### 2. `wren-security watch [path]` (or `wren watch`)

Starts incremental watch mode, monitoring your project for file modifications and re-scanning automatically on save:

```bash
wren-security watch
wren-security watch ./src
```

---

### 3. `wren-security fix [findingId]` (or `wren fix`)

Generates an AST-verified remediation patch with colored diff preview and interactive confirmation:

```bash
wren-security fix
wren-security fix --yes
wren-security fix --dry-run
wren-security fix --open-pr --repo owner/repo
```

| Flag | Type | Description | Default |
|---|---|---|---|
| `[findingId]` | `string` | ID of the finding to remediate | First finding |
| `-y, --yes` | `boolean` | Apply patch directly without interactive confirmation | `false` |
| `--dry-run` | `boolean` | Preview unified diff patch without writing to disk | `false` |
| `--apply-locally` | `boolean` | Apply verified patch directly to the target file on disk | `false` |
| `--open-pr` | `boolean` | Create a branch and open a GitHub Pull Request | `false` |
| `--repo <owner/repo>`| `string` | Target GitHub repository (auto-detected from git remote) | Local remote |
| `--file <file>` | `string` | Target file path to patch | — |
| `--api-url <url>` | `string` | Custom Wren Cloud API endpoint | `http://localhost:3000` |

---

### 4. Configuration & Auth Commands

```bash
wren-security init
wren-security login <token>
wren-security logout
```

---

## Development & Monorepo Workflows

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 10.0.0

### Getting Started

```bash
git clone https://github.com/SreeshanthReddy46/Wren-VibeScan.git
cd Wren-VibeScan

pnpm install
pnpm dev
pnpm build
pnpm -r typecheck
pnpm --filter @wren/core test
pnpm --filter wren-security test
```

---

## License

[MIT](LICENSE) © Wren Security
