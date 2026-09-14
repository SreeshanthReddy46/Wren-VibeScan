# Wren Security Network Egress Invariants

## Core Principles

Wren is designed for privacy-preserving security analysis. Code is scanned locally on the developer's machine or in their CI runner. Only minimal, localized data is ever transmitted when AI reasoning or cloud features are activated.

---

## Egress Invariants

### 1. Snippet-Only Egress
- When LLM deep reasoning is enabled, the CLI transmits **only** the code snippet associated with a flagged finding (bounded to the immediate context of the finding, max 50 lines).
- Full source code files are **never** transmitted in the initial prompt or triage phase.
- Unflagged files across the repository are **never** transmitted.

### 2. No Repository Tree Egress
- File discovery and directory traversal occur entirely in memory on the local machine.
- The repository directory structure or complete file list is **never** sent to Claude or Wren Cloud APIs.

### 3. Strict Read-Only Tool-Assisted Slices
- During the agent investigation loop, if the reasoning engine requests context via `read_file`, only targeted, bounded slices (max 100 lines) of specifically requested source files are read.
- The agent tool dispatcher operates under strict read-only constraints in code.
- Credential files (`.env`, `.env.*`, `.git/config`, `id_rsa`, `id_ed25519`, `.aws/credentials`) are blocked by code-level security guards and cannot be read by the agent.

### 4. Sanitized Telemetry & Crash Reporting
- Sentry telemetry transmits only error messages, stack traces, and system platform metadata (OS, architecture, Node version, CLI version).
- Command-line arguments containing `--api-key` or token values (`sk-...`, `wren_...`) are redacted before transmission.
- Telemetry respects `DO_NOT_TRACK=1`, `WREN_TELEMETRY=0`, and user configuration opt-outs.

### 5. Automated Remediation Egress
- When `--open-pr` is invoked, only the unified diff of the generated patch and the single target file path are transmitted to create the pull request.
