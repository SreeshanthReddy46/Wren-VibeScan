# Secrets Audit and Production Rotation Guide

## 1. Executive Summary & Audit Verification

An exhaustive security audit of the Wren repository was conducted across all git-tracked files, configuration templates, and working directory files.

### Audit Findings
- **Git-Tracked Files**: No live production secrets, private keys, or credentials are tracked in Git.
- **Pattern Matches**:
  - `packages/core/src/rules/ast-rules.ts`: Contains regex matching patterns (e.g., `sk-ant-api[0-9]{2}-...`, `AKIA[0-9A-Z]{16}`) for scanning user code.
  - `benchmarks/evaluation/dataset.ts`: Contains synthetic dummy keys (e.g., `sk-ant-api03-mock-key-for-test-eval-only`) used solely for offline precision/recall benchmarking.
  - Test suites: Contain mock authorization headers and synthetic tokens for local unit testing.
- **Git Ignore Invariants**:
  - All `.env`, `.env*.local`, `.env.production`, `.env.test` files are explicitly excluded in `.gitignore`.
  - All PEM files (`*.pem`) and runtime cache directories (`.wren/`) are excluded in `.gitignore`.
  - Debug logs (`npm-debug.log*`, `yarn-error.log*`, `pnpm-debug.log*`) are excluded.

---

## 2. Emergency & Periodic Key Rotation Runbook

If any API key or secret token is suspected of exposure, or as part of scheduled 90-day operational key rotation, execute the following playbooks.

### A. Anthropic Claude API Key Rotation

1. **Generate Replacement Key**:
   - Navigate to the [Anthropic Console](https://console.anthropic.com/).
   - Go to **Settings** > **API Keys**.
   - Click **Create Key**, name it `wren-production-<YYYY-MM-DD>`, and copy the secret token immediately.
2. **Update Environments**:
   - Local CLI users: Re-run `wren init` or update `~/.wren/config.json` with the new token.
   - Production Cloud / Web API: Update `ANTHROPIC_API_KEY` in Vercel project environment settings or server environment variables.
3. **Verify Functionality**:
   - Run a test scan: `wren check --deep-reasoning` or invoke the API scan endpoint.
   - Check application telemetry to confirm HTTP 200 responses from Anthropic.
4. **Revoke Previous Key**:
   - In Anthropic Console, click **Delete** next to the old key.

---

### B. Stripe Secret Key & Webhook Secret Rotation

1. **Roll Secret Key**:
   - Open the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
   - Locate the standard secret key or restricted API key (`rk_live_...`).
   - Click the three dots next to the key and select **Roll key...**.
   - Choose an expiration window for the old key (e.g., 12 or 24 hours to allow zero-downtime transition) or revoke immediately if compromised.
2. **Rotate Webhook Signing Secret**:
   - Go to **Developers** > **Webhooks**.
   - Select the production endpoint (`/api/webhooks/stripe`).
   - Under **Signing secret**, click **Roll secret**.
3. **Deploy Configuration**:
   - Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in production secrets manager / hosting provider.
   - Verify billing checkout flow and subscription status webhook ingestion.
4. **Finalize Expiration**:
   - Verify no requests remain on the legacy key, then permanently delete it.

---

### C. Supabase Service Role Key & Database Password

1. **Rotate Service Role Key**:
   - Go to the [Supabase Dashboard](https://supabase.com/dashboard) and select the Wren production project.
   - Navigate to **Project Settings** > **API**.
   - Under **Project API keys**, click **Generate new JWT secret** or roll the service role key.
2. **Rotate Database Password & Connection Strings**:
   - Navigate to **Project Settings** > **Database**.
   - Click **Reset Database Password** and generate a strong 32+ character random password.
   - Update `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in all backend deployments.
3. **Verify Database Connectivity & Row Level Security**:
   - Verify connection pooler connectivity (`PgBouncer` / `Supavisor`).
   - Confirm backend API endpoints successfully read/write to `scans` table.
   - Execute cross-tenant isolation test to ensure RLS policies remain active.

---

## 3. Defense-in-Depth Secret Hygiene

1. **Agent Tool Sandboxing**:
   - The CLI and Core tool runner explicitly disallows reading `.env*`, `id_rsa`, `.git/config`, and cloud credential files.
2. **Network Payload Invariant**:
   - Wren CLI never sends full repositories or arbitrary files to remote endpoints; only localized finding snippets are transmitted.
3. **Crash Reporter Sanitization**:
   - All CLI flags, parameters, and paths are stripped of tokens, emails, and sensitive keys before being sent to Sentry or crash reporting.
