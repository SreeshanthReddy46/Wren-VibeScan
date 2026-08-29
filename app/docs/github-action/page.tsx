import * as React from "react";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata = {
  title: "GitHub Action Setup — Wren Docs",
  description: "Configure Wren in your GitHub Actions CI/CD pipeline.",
};

export default function GitHubActionPage() {
  const workflowYaml = `name: Wren Security Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    name: Scan AI-Coded Vulnerabilities
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Wren
        uses: wren/action@v1
        with:
          directory: './'
          fail_on_critical: true
        env:
          WREN_API_KEY: \${{ secrets.WREN_API_KEY }}`;

  return (
    <div className="space-y-10">
      <div className="space-y-3 pb-6 border-b border-zinc-100">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
          GitHub Action Setup
        </h1>
        <p className="text-lg text-zinc-600 leading-relaxed">
          Add the Wren action to your workflow to scan on every push and pull request.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-950">Workflow Configuration</h2>
        <p className="text-zinc-600 text-sm">
          Create a file at <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800 font-mono">.github/workflows/wren.yml</code> with the following configuration:
        </p>
        <CodeBlock code={workflowYaml} language="yaml" title=".github/workflows/wren.yml" />
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-zinc-950">Setting up Secrets</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 leading-relaxed">
          <li>Navigate to your repository <strong>Settings &gt; Secrets and variables &gt; Actions</strong>.</li>
          <li>Click <strong>New repository secret</strong>.</li>
          <li>Set the name to <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-900 font-semibold">WREN_API_KEY</code> and paste your key from the Dashboard settings.</li>
        </ol>
      </div>
    </div>
  );
}
