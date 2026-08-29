# Wren

**A security scanner built for the AI-coding era.**

Wren catches the vulnerabilities that slip into apps built with AI coding
tools — Cursor, Bolt, Lovable, v0, and similar — before they ever reach
production.

---

## Why Wren Exists

AI coding tools have made it possible to ship a working app in minutes.
What they haven't solved is security review. Code that looks complete in
a demo often ships with the same quiet, dangerous mistakes: exposed API
keys, missing authentication checks, unprotected database rules, and
edge cases nobody tested because the happy path worked fine.

These issues don't show up until someone finds them — and by then, it's
usually too late. Wren exists to find them first.

---

## What Wren Checks For

- **Exposed secrets** — hardcoded API keys, committed `.env` files,
  credentials left in client-side code
- **Missing authentication** — routes and endpoints with no auth check,
  or auth logic that isn't actually reachable in every code path
- **Unprotected data access** — database rules and permissions that
  leave records readable or writable by anyone
- **Unhandled edge cases** — the failure states AI-generated code
  systematically skips because only the happy path was ever tested

---

## How It Works

Wren combines three layers of review:

1. **Fast pattern-based scanning** catches the well-known, deterministic
   issues — the ones with a clear signature.
2. **Structural code analysis** goes deeper, tracing logic that pattern
   matching alone can't reach — like whether a permission check actually
   applies where it's supposed to.
3. **Targeted reasoning on flagged issues** evaluates the small set of
   candidates the first two layers surface, reducing false positives and
   catching problems that require understanding intent, not just syntax.

The result is a report ranked by severity, written in plain language,
pointing to the exact file and line — built to read like a clean audit
log, not a wall of warnings.

---

## Getting Started

```bash
npx wren check
```

That's it. Wren scans your project from the terminal and prints a
report. No account required to run a local scan.

For continuous checks on every pull request, Wren also runs as a GitHub
Action.

---

## A Note on Privacy

Wren scans locally by default. Your source code is not uploaded to run
a scan — only summary results sync to your dashboard if you choose to
create an account. A security tool asking for your entire codebase
should be a hard sell, and we built Wren so it doesn't have to be one.

---

## The Name

A wren is a small, easily overlooked bird — but its call is precise and
impossible to miss. Wren stays quiet until it finds something real, then
tells you exactly what, and where.

---

## Status

Wren is under active development. Feedback, issues, and early testers
are welcome.
