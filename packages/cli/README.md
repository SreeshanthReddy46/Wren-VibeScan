# wren-security 🦅

> **Security scanning & autonomous remediation for AI-generated code, directly from your terminal.**  
> Catch what Cursor, Lovable, Bolt, and v0 leave behind — before it reaches production.

[![npm version](https://img.shields.io/npm/v/wren-security.svg?style=flat-square&color=0284c7)](https://www.npmjs.com/package/wren-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/wren-security.svg?style=flat-square)](https://nodejs.org)

---

## What's New in Wren 3.0

- 🔍 **Live Investigation View**: Transparent multi-step agent reasoning streamed live to your terminal:
  ```text
  ⠋ Investigating /api/users/[id]
    → read_file  app/api/users/[id]/route.ts
    → search     "requireAuth"  (0 matches)
    → verdict    HIGH · no auth check in any call path
  ```
- 🔧 **Interactive `wren fix` with Colored Diff**: Review verified unified diff patches and confirm application (`[y/n/q]`). Nothing is ever applied silently.
- 👀 **Incremental Watch Mode (`wren watch`)**: Automatically monitors your workspace and re-scans modified files on save with a live dashboard.
- 🧠 **Structured Ignore Memory (`.wren/ignore.json`)**: Persistent ignore records with explicit reasons so false positives never nag twice. Automatically migrates legacy `.wrenignore` files.
- 🖥️ **Full-Screen Interactive Terminal UI**: Run `wren` without arguments in any interactive terminal for split-pane navigation, tabbed detail views, and one-key ignores.

---

## Quick Start (Zero Install)

Run instantly against any directory with `npx`:

```bash
npx wren-security check .
```

Or install globally:

```bash
npm install -g wren-security
wren-security check
```

Or launch the interactive terminal UI:

```bash
wren
```

---

## Why Wren?

AI code generators prioritize **speed** and **making the UI work immediately**. In doing so, they systematically leave critical security holes:

1. **Hardcoding secrets & API keys** (`sk-...`, `sk_live_...`, database URIs) directly in source code.
2. **Generating backend mutating endpoints** (`POST`, `PUT`, `DELETE`) without verifying authenticated user sessions.
3. **Leaking admin credentials** by prefixing server keys with `NEXT_PUBLIC_` or referencing Supabase Service Role keys in client bundles.
4. **Defaulting database security rules** to wide-open permissions (`allow read, write: if true;`) so tests pass during prompting.

**Wren scans your codebase in milliseconds, flags high-risk AI patterns, and provides AST-verified patches to fix them.**

---

## Commands & Usage

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

#### Scan Options:

| Flag | Type | Description | Default |
|---|---|---|---|
| `[path]` | `string` | Target directory to scan | `.` (current directory) |
| `--async` | `boolean` | Dispatch scan to background queue and stream progress | `false` |
| `--fail-on-critical` | `boolean` | Exit code `1` if critical findings are found | `false` |
| `--fail-on <severity>` | `string` | Exit code `1` if findings at or above threshold exist (`critical`, `high`, `medium`) | — |
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

- Sub-second incremental feedback loop.
- Automatically clears and updates terminal dashboard on change.
- Respects `.gitignore` and `.wren/ignore.json`.

---

### 3. `wren-security fix [findingId]` (or `wren fix`)

Generates AST syntax-verified remediation patches with colored diff preview:

```bash
# Preview diff and prompt interactively before applying [y/n/q]
wren-security fix

# Automatically apply fix without prompting (for CI/CD)
wren-security fix --yes

# Preview diff only without touching files on disk
wren-security fix --dry-run

# Dispatch an isolated branch and Pull Request via GitHub App
wren-security fix --open-pr --repo owner/repo
```

#### Fix Options:

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

### 4. `wren-security init` (or `wren init`)

Initializes modern Wren 3.0 configuration inside `.wren/`:

```bash
wren-security init
```

Creates:
- `.wren/ignore.json`: Structured persistent ignore memory with rule IDs and rationale.
- `.wren/config.json`: Project scan rules and severity failure thresholds.

---

### 5. `wren-security login [token]` & `wren-security logout`

Connect your CLI to your Wren Cloud dashboard:

```bash
wren-security login
wren-security login <your-api-token>
wren-security logout
```

Credentials are saved in `~/.wren/config.json` (respects `XDG_CONFIG_HOME`).

---

## Vulnerabilities Detected

| Rule ID | Category | Severity | Description | CWE |
|---|---|---|---|---|
| `WREN-SEC-001` | Secret | **Critical** | Hardcoded OpenAI API key (`sk-proj-...`, `sk-...`) | CWE-798 |
| `WREN-SEC-002` | Secret | **Critical** | Live Stripe secret key (`sk_live_...`) committed in source | CWE-798 |
| `WREN-SEC-003` | Secret | **Critical** | Anthropic Claude API key (`sk-ant-...`) exposed | CWE-798 |
| `WREN-SEC-004` | Secret | **Critical** | AWS Access Key ID (`AKIA...`) hardcoded | CWE-798 |
| `WREN-SEC-005` | Secret | **Critical** | GitHub Personal Access Token (`ghp_...`, `github_pat_...`) | CWE-798 |
| `WREN-DB-001` | Database | **Critical** | Database connection URI with embedded plaintext password | CWE-312 |
| `WREN-SEC-006` | Secret | **High** | Secret variable leaked to browser bundle with `NEXT_PUBLIC_` | CWE-200 |
| `WREN-AUTH-001` | Auth | **High** | Mutating API route (`route.ts`) missing user authentication check | CWE-306 |
| `WREN-AUTH-002` | Auth | **Critical** | Supabase Service Role key referenced in a client component | CWE-285 |
| `WREN-DB-003` | Database | **Critical** | Firestore rules permitting unrestricted public read/write (`if true;`) | CWE-276 |
| `WREN-CONF-001` | Config | **Medium** | Permissive wildcard CORS header (`*`) on API endpoints | CWE-346 |

---

## GitHub Actions CI/CD Integration

Add Wren to `.github/workflows/security.yml` to automatically scan every Pull Request:

```yaml
name: Wren Security Scan

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  wren-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Wren Security Check
        run: npx wren-security check . --format sarif -o results.sarif --fail-on-critical

      - name: Upload SARIF to GitHub Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

---

## Ignore Memory Configuration (`.wren/ignore.json`)

```json
{
  "version": "1.0.0",
  "ignores": [
    {
      "id": "ign-fixtures",
      "ruleId": "*",
      "filePath": "fixtures/**",
      "reason": "Test fixture mock code",
      "ignoredAt": "2026-10-15T12:00:00.000Z"
    }
  ]
}
```

---

## Security & Privacy Policy

- **100% Local Execution**: Source code is parsed and analyzed locally on your machine.
- **Zero Telemetry Leaks**: Code snippets are never transmitted to external analytics.

---

## Contributing & Issues

- Issues & Feature Requests: [GitHub Issues](https://github.com/SreeshanthReddy46/Wren-VibeScan/issues)
- Web Platform: [https://wren.dev](https://wren.dev)

## License

[MIT](LICENSE) © Wren Security
