# wren-cli 🦅

> **Security scanning for AI-generated code, directly from your terminal.**  
> Catch what Cursor, Lovable, Bolt, and v0 leave behind — before it reaches production.

[![npm version](https://img.shields.io/npm/v/wren-cli.svg?style=flat-square&color=0284c7)](https://www.npmjs.com/package/wren-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/wren-cli.svg?style=flat-square)](https://nodejs.org)
[![Provenance](https://img.shields.io/badge/npm-provenance-brightgreen.svg?style=flat-square)](https://docs.npmjs.com/generating-provenance-statements)

---

## Quick Start (Zero Install)

Run instantly against any directory with `npx`:

```bash
npx wren-cli check .
```

Or install globally:

```bash
npm install -g wren-cli
wren-cli check
```

---

## Why Wren?

AI code generators prioritize **speed** and **making the UI work immediately**. In doing so, they systematically leave critical security holes:

1. **Hardcoding secrets & API keys** (`sk-...`, `sk_live_...`) directly in source code.
2. **Generating backend mutating endpoints** (`POST`, `PUT`, `DELETE`) without verifying authenticated user sessions.
3. **Leaking admin credentials** by prefixing server keys with `NEXT_PUBLIC_` or using Supabase Service Role keys inside client components.
4. **Defaulting database security rules** to wide-open permissions (`allow read, write: if true;`) so tests pass during prompting.

**Wren scans your codebase in milliseconds, flags high-risk AI patterns, and outputs exact copy-paste code diffs to fix them.**

---

## Features

- ⚡ **Zero-Config & Instant**: Runs locally in sub-seconds. No heavy daemon, no remote code upload required.
- 🛡️ **AI-Specific Static & AST Engine**: Tailored heuristics targeting the signature mistakes of LLM-generated code.
- 🚦 **CI/CD Built-In**: `--fail-on-critical` returns a non-zero exit code to automatically block dangerous PRs.
- 📊 **GitHub Code Scanning (SARIF 2.1.0)**: Export findings directly into GitHub's Security Tab.
- 🔒 **Zero Data Retention**: Your source code never leaves your machine. Local scanning is 100% offline.
- 💡 **Actionable Remediations**: Every finding includes a human-readable explanation, CWE reference, and an exact unified diff fix.

---

## Commands & Usage

### 1. `wren-cli check [path]` (or `wren-cli scan`)

Scans your files for security vulnerabilities.

```bash
# Scan current directory
wren-cli check

# Scan a specific folder
wren-cli check ./src

# Exit with code 1 if critical vulnerabilities exist (perfect for CI/CD)
wren-cli check --fail-on-critical

# Fail on high or critical issues
wren-cli check --fail-on high

# Output as SARIF for GitHub Security Tab
wren-cli check --format sarif -o results.sarif

# Output as machine-readable JSON
wren-cli check --format json -o wren-report.json

# Enable LLM-assisted reasoning
wren-cli check --llm
```

#### CLI Options:

| Flag | Type | Description | Default |
|---|---|---|---|
| `[path]` | `string` | Target directory to scan | `.` (current directory) |
| `--fail-on-critical` | `boolean` | Exit code `1` if critical findings are found | `false` |
| `--fail-on <severity>` | `string` | Exit code `1` if findings at or above threshold exist (`critical`, `high`, `medium`) | — |
| `--format <format>` | `string` | Output format: `terminal`, `json`, or `sarif` | `terminal` |
| `--llm` | `boolean` | Enrich findings with contextual LLM reasoning | `false` |
| `-o, --output <file>` | `string` | Write report output directly to a file | stdout |
| `--api-key <key>` | `string` | Wren Cloud or Anthropic API key | — |
| `-v, --version` | `boolean` | Display version number | — |
| `-h, --help` | `boolean` | Show help and options | — |

---

### 2. `wren-cli init`

Initializes Wren configuration in your repository:

```bash
wren-cli init
```

Creates:
- `.wrenignore`: Excludes test fixtures, mock data, or build directories.
- `.wrenrc.json`: Configures failure thresholds and rule overrides.

---

### 3. `wren-cli login [token]` & `wren-cli logout`

Connect your CLI to your Wren Cloud dashboard:

```bash
# Interactive token prompt
wren-cli login

# Or pass token directly
wren-cli login <your-api-token>

# Remove stored credentials
wren-cli logout
```

Stored securely in `~/.wren/config.json` (respects `XDG_CONFIG_HOME`).

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

Add Wren to your `.github/workflows/security.yml` to automatically scan every Pull Request:

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
      security-events: write # Required for SARIF upload
      contents: read

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Wren Security Check
        run: npx wren-cli check . --format sarif -o results.sarif --fail-on-critical

      - name: Upload SARIF to GitHub Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

---

## Programmatic Node.js API

You can also use Wren programmatically inside Node.js or build scripts:

```typescript
import { runScan } from "wren-cli";

async function audit() {
  const result = await runScan({
    targetPath: "./src",
    failOnSeverity: "critical",
  });

  console.log(`Scanned ${result.summary.filesScanned} files.`);
  console.log(`Total Findings: ${result.summary.totalFindings}`);

  for (const finding of result.findings) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
    console.log(`  File: ${finding.location.filePath}:${finding.location.startLine}`);
    console.log(`  Fix: ${finding.fix.description}`);
  }
}

audit();
```

---

## Configuration (`.wrenrc.json`)

```json
{
  "$schema": "https://wren.dev/schema.json",
  "version": 1,
  "failOn": "critical",
  "ignoreRules": [
    "WREN-CONF-001"
  ],
  "ignorePaths": [
    "fixtures/**",
    "**/*.test.ts"
  ]
}
```

---

## Security & Privacy Policy

- **100% Local Execution**: Source code is parsed and analyzed locally on your machine.
- **Zero Telemetry Leaks**: Code snippets are never transmitted to external analytics.
- **Audited Builds**: Published with **npm provenance** cryptographically linking each package to its GitHub Actions commit and workflow.

---

## Contributing & Issues

- Issues & Feature Requests: [GitHub Issues](https://github.com/SreeshanthReddy46/Wren-VibeScan/issues)
- Web Platform & Docs: [https://wren.dev](https://wren.dev)

## License

[MIT](LICENSE) © Wren Security
