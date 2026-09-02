# Wren 🦅

> **Security scanning for AI-generated code, from your terminal to production.**  
> Catch what Cursor, Lovable, Bolt, and v0 leave behind — before it reaches users.

[![npm version](https://img.shields.io/npm/v/wren-cli.svg?style=flat-square&color=0284c7)](https://www.npmjs.com/package/wren-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://img.shields.io/github/actions/workflow/status/SreeshanthReddy46/Wren-VibeScan/ci.yml?branch=main&style=flat-square)](https://github.com/SreeshanthReddy46/Wren-VibeScan/actions)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-ef4444.svg?style=flat-square)](https://turbo.build/repo)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg?style=flat-square)](https://pnpm.io)

---

## What is Wren?

Wren statically analyzes modern web and full-stack codebases to flag the subtle, dangerous security vulnerabilities AI coding assistants leave behind:
- **Exposed API keys & secrets** (`sk-...`, `sk_live_...`, database credentials)
- **Unauthenticated route handlers** (`POST`/`DELETE` endpoints lacking session checks)
- **Client-side leaked admin keys** (`NEXT_PUBLIC_` prefixes on private tokens)
- **Overly permissive database security rules** (`allow read, write: if true;`)

Wren combines sub-second static analysis with AST parsing to pinpoint the exact line, explain the threat in plain English, and provide a copy-paste code diff fix.

---

## Monorepo Architecture

This repository is organized as a **Turborepo** + **pnpm workspace** monorepo:

```
wren/
├── apps/
│   └── web/                    # Next.js 15 web app — marketing, dashboard, and API endpoints
│
├── packages/
│   ├── cli/                    # The npm-published "wren-cli" package (wren-cli check, login, init)
│   ├── core/                   # Scan engine logic — shared between CLI and GitHub Action
│   ├── shared-types/           # TypeScript types shared across web + CLI
│   └── config/                 # Shared tsconfig bases (base, nextjs, node)
│
├── .changeset/                 # Changesets release config & automated changelog
├── .github/workflows/          # CI/CD pipelines (CI testing + npm provenance publishing)
├── turbo.json                  # Turborepo task pipelines
└── pnpm-workspace.yaml         # pnpm workspace definition
```

---

## Quick Start (Zero Install)

Run directly against your current repository using `npx`:

```bash
npx wren-cli check .
```

Or install globally:

```bash
npm install -g wren-cli
wren-cli check
```

---

## Core Features

- ⚡ **Lightning Fast**: Local scans run in milliseconds. No code is uploaded to the cloud.
- 🎯 **Tailored for Vibe-Coding**: Specific rules targeting the known hallucination and oversight patterns of AI models.
- 🚦 **CI/CD Failure Gates**: `--fail-on-critical` fails your build on critical vulnerabilities.
- 📊 **GitHub Code Scanning**: Export findings directly to SARIF 2.1.0 format (`wren-cli check --format sarif`).
- 🛠️ **Remediation Code Diffs**: Instant code patches ready to apply.

---

## CLI Commands

| Command | Description |
|---|---|
| `wren-cli check [path]` | Scan directory for vulnerabilities (aliases: `wren-cli [path]`, `wren-cli scan`) |
| `wren-cli init` | Generate `.wrenignore` and `.wrenrc.json` configuration |
| `wren-cli login [token]` | Connect CLI to your Wren Cloud dashboard |
| `wren-cli logout` | Remove stored local credentials |
| `wren-cli --version` | Print installed CLI version |
| `wren-cli --help` | Show command help and options |

---

## Development & Monorepo Workflows

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 11.0.0

### Getting Started

```bash
# Clone the repository
git clone https://github.com/SreeshanthReddy46/Wren-VibeScan.git
cd Wren-VibeScan

# Install dependencies across all workspace packages
pnpm install

# Start development servers (Web app on port 3000 + watch mode for packages)
pnpm dev

# Build all packages with Turborepo caching
pnpm build

# Run typecheck across all workspace projects
pnpm typecheck

# Run CLI pre-publish smoke test
pnpm --filter wren-cli run test:smoke
```

---

## Automated Releases & Changesets

Wren follows automated semantic versioning powered by [Changesets](https://github.com/changesets/changesets):

1. Make a change in a package.
2. Run `pnpm changeset` and describe the change (patch, minor, or major).
3. Open a PR and merge to `main`.
4. GitHub Actions automatically generates a "Version Packages" PR and publishes to npm with cryptographic provenance (`id-token: write`).

---

## License

[MIT](LICENSE) © Wren Security
