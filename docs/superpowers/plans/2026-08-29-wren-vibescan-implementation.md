# Wren (VibeScan) Web Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Next.js 15 App Router web application with TypeScript, Tailwind CSS, shadcn-inspired components, marketing pages faithfully matching Relume's design, interactive documentation, authentication pages, and vulnerability scan dashboard.

**Architecture:** App Router architecture separating `(marketing)` static routes, `/docs` sidebar layout, `(auth)` minimal layout, and `(dashboard)` authenticated workspace. Reusable UI components in `components/ui/`, section-specific components in `components/marketing/`, `components/docs/`, and `components/dashboard/`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons, clsx, tailwind-merge.

## Global Constraints
- Next.js 15 with React Server Components and Client Components (`"use client"` where needed).
- Exact design fidelity matching `vibescan.relumesite.ai` for the marketing routes.
- Fully working responsive navigation, video modal, waitlist form, docs code copy, and dashboard scan reports.
- Clean typography using Inter font and modern dark/light contrast tokens.

---

### Task 1: Initialize Next.js Project & Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/globals.css`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: `cn(...inputs)` in `lib/utils.ts`
- Produces: Next.js dev server & build configuration

- [ ] **Step 1: Create package.json and install dependencies**
- [ ] **Step 2: Create TypeScript and Tailwind configuration**
- [ ] **Step 3: Create global CSS with design tokens and Inter font setup**
- [ ] **Step 4: Create `lib/utils.ts` for className merging**
- [ ] **Step 5: Verify build/setup**

---

### Task 2: Build UI Component Primitives & Mock Data Store

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `lib/mock-data.ts`

**Interfaces:**
- Produces: `Button`, `Badge`, `Card`, `Input`, `Dialog` primitives
- Produces: `MOCK_SCANS`, `MOCK_CHANGELOG`, `MOCK_DOCS_NAV`

- [ ] **Step 1: Implement `lib/mock-data.ts` containing realistic scan results, code diffs, changelog entries, and pricing tiers**
- [ ] **Step 2: Implement `components/ui/` primitives**
- [ ] **Step 3: Verify TypeScript compilation**

---

### Task 3: Implement Marketing Components & Layout

**Files:**
- Create: `components/marketing/Navbar.tsx`
- Create: `components/marketing/Footer.tsx`
- Create: `components/marketing/HeroSection.tsx`
- Create: `components/marketing/ProblemSection.tsx`
- Create: `components/marketing/DemoSection.tsx`
- Create: `components/marketing/HowItWorksSection.tsx`
- Create: `components/marketing/WaitlistSection.tsx`
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`

**Interfaces:**
- Produces: Complete, responsive landing page matching `vibescan.relumesite.ai`

- [ ] **Step 1: Build floating pill `Navbar.tsx` with mobile drawer and active states**
- [ ] **Step 2: Build `HeroSection.tsx` with tagline, heading, and terminal asset**
- [ ] **Step 3: Build `ProblemSection.tsx` with 3 vulnerability highlights**
- [ ] **Step 4: Build `DemoSection.tsx` with interactive Video Lightbox modal**
- [ ] **Step 5: Build `HowItWorksSection.tsx` and `WaitlistSection.tsx` with live email validation state**
- [ ] **Step 6: Build `Footer.tsx` and assemble in `app/(marketing)/page.tsx`**

---

### Task 4: Implement Marketing Sub-Pages (`/pricing`, `/changelog`, `/terms`, `/privacy`)

**Files:**
- Create: `app/(marketing)/pricing/page.tsx`
- Create: `app/(marketing)/changelog/page.tsx`
- Create: `app/(marketing)/terms/page.tsx`
- Create: `app/(marketing)/privacy/page.tsx`

**Interfaces:**
- Produces: Dedicated marketing routes with feature comparison, version history, and legal policies

- [ ] **Step 1: Build `pricing/page.tsx` with monthly/yearly toggle, 3 plan cards, and feature matrix**
- [ ] **Step 2: Build `changelog/page.tsx` with release entries (v0.4.0, v0.3.0, v0.2.0)**
- [ ] **Step 3: Build `terms/page.tsx` and `privacy/page.tsx`**

---

### Task 5: Implement Documentation Section (`/docs`)

**Files:**
- Create: `components/docs/DocsSidebar.tsx`
- Create: `components/docs/CodeBlock.tsx`
- Create: `app/docs/layout.tsx`
- Create: `app/docs/page.tsx`
- Create: `app/docs/installation/page.tsx`
- Create: `app/docs/github-action/page.tsx`
- Create: `app/docs/understanding-reports/page.tsx`
- Create: `app/docs/faq/page.tsx`

**Interfaces:**
- Produces: Documentation layout with active sidebar, breadcrumbs, copyable CLI commands, and FAQ accordions

- [ ] **Step 1: Build `DocsSidebar.tsx` and `CodeBlock.tsx` with clipboard copy**
- [ ] **Step 2: Build `app/docs/layout.tsx` and `page.tsx` (Getting Started)**
- [ ] **Step 3: Build `installation`, `github-action`, `understanding-reports`, and `faq` pages**

---

### Task 6: Implement Authentication Pages (`/login`, `/signup`)

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

**Interfaces:**
- Produces: Centered authentication screens with GitHub OAuth button, form validation, and error states

- [ ] **Step 1: Build `(auth)/layout.tsx` with clean centered frame and back-to-home link**
- [ ] **Step 2: Build `login/page.tsx` and `signup/page.tsx`**

---

### Task 7: Implement Dynamic Dashboard & Scan Report Inspector (`/dashboard`, `/scans/[scanId]`, `/settings`)

**Files:**
- Create: `components/dashboard/DashboardHeader.tsx`
- Create: `components/dashboard/DashboardSidebar.tsx`
- Create: `components/dashboard/ScanFindingsList.tsx`
- Create: `components/dashboard/RemediationCodeDiff.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`
- Create: `app/(dashboard)/scans/[scanId]/page.tsx`
- Create: `app/(dashboard)/settings/page.tsx`

**Interfaces:**
- Produces: Full dashboard with stats cards, scan table, finding filters, and vulnerability inspection views

- [ ] **Step 1: Build dashboard navigation and header**
- [ ] **Step 2: Build `/dashboard` overview page with metric summaries and recent scans**
- [ ] **Step 3: Build `/scans/[scanId]` with detailed finding inspection, severity pills, and code diff fixes**
- [ ] **Step 4: Build `/settings` with API keys and billing management**

---

### Task 8: Implement Root Layout, 404 Page, and End-to-End Verification

**Files:**
- Create: `app/layout.tsx`
- Create: `app/not-found.tsx`

**Interfaces:**
- Produces: Root SEO metadata, favicons, 404 error handler, and verified dev server build

- [ ] **Step 1: Build `app/layout.tsx` and `app/not-found.tsx`**
- [ ] **Step 2: Copy assets to `public/assets/`**
- [ ] **Step 3: Run `npm run build` and start dev server**
- [ ] **Step 4: Verify all pages and responsive behavior in browser subagent**
