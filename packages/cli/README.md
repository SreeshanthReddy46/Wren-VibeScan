# Wren 🦅

**Security scanning for AI-generated code, from your terminal.**

Wren statically scans your codebase and flags the vulnerabilities AI coding tools (Cursor, Bolt, Lovable, v0) tend to leave behind — exposed keys, missing auth checks, and unsafe database rules — before they reach production.

## Quick Start (Zero Install)

Run directly with `npx`:

```bash
npx wren check .
```

Or install globally:

```bash
npm install -g wren
wren check
```

## Commands

- `wren check [path]` — Scan codebase for vulnerabilities.
  - `--fail-on-critical` — Exit with code 1 if critical issues exist (ideal for CI/CD).
  - `--format <terminal|json|sarif>` — Output format (supports SARIF for GitHub Code Scanning).
  - `--llm` — Enable LLM reasoning enrichment via Claude.
- `wren init` — Generate default `.wrenignore` and `.wrenrc.json`.
- `wren login` — Connect local CLI to Wren Cloud.
- `wren logout` — Clear stored credentials.

## License

MIT © Wren Security
