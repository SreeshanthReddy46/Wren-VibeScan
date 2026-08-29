# Design Specification: Wren (VibeScan) Web Application

**Date**: 2026-08-29  
**Status**: Ready for Review  

---

## 1. Overview & Vision
Wren (VibeScan) is a security platform designed to catch vulnerabilities in AI-generated and "vibe-coded" applications (such as exposed API keys, missing auth checks, and unprotected database rules). 

This project implements the full production web application using Next.js (App Router), TypeScript, and Tailwind CSS. It faithfully matches every detail, typography, component, and interaction from the Relume design while expanding into the full product architecture: marketing routes, interactive documentation with sidebar navigation, clean authentication flows, and a dynamic vulnerability scan dashboard with detailed report inspection.

---

## 2. Architecture & File Structure

```
wren/
├── app/
│   ├── layout.tsx                     # Root layout — Inter font, metadata, toast provider, theme
│   ├── not-found.tsx                  # Custom 404 page matching the dark/light aesthetic
│   │
│   ├── (marketing)/                   # Static, SEO-optimized marketing pages
│   │   ├── layout.tsx                 # Floating pill navbar + marketing footer
│   │   ├── page.tsx                   # / (Landing page faithfully matching Relume design)
│   │   ├── pricing/page.tsx           # /pricing (Free, Pro, Team tier cards + feature comparison)
│   │   ├── changelog/page.tsx         # /changelog (v0.4.0, v0.3.0, v0.2.0 release history)
│   │   ├── terms/page.tsx             # /terms (Terms of Service)
│   │   └── privacy/page.tsx           # /privacy (Privacy Policy)
│   │
│   ├── docs/                          # Documentation section with dedicated sidebar layout
│   │   ├── layout.tsx                 # Docs sidebar navigation layout
│   │   ├── page.tsx                   # /docs (Overview & Getting Started)
│   │   ├── installation/page.tsx      # /docs/installation (CLI installation & requirements)
│   │   ├── github-action/page.tsx     # /docs/github-action (CI/CD integration workflow)
│   │   ├── understanding-reports/page.tsx # /docs/understanding-reports (Severity & findings explanation)
│   │   └── faq/page.tsx               # /docs/faq (Common questions & troubleshooting)
│   │
│   ├── (auth)/                        # Clean, focused auth pages
│   │   ├── layout.tsx                 # Minimal centered layout (no header/footer distraction)
│   │   ├── login/page.tsx             # /login (GitHub OAuth + Email/Password sign-in)
│   │   └── signup/page.tsx            # /signup (New account registration)
│   │
│   └── (dashboard)/                   # Authenticated user dashboard & scan inspector
│       ├── layout.tsx                 # Dashboard sidebar, project switcher, user profile
│       ├── dashboard/page.tsx         # /dashboard (Overview of repositories, scan history, quick scan)
│       ├── scans/[scanId]/page.tsx    # /scans/[scanId] (Detailed scan findings, severity badges, file & line markers, remediation code snippets)
│       └── settings/page.tsx          # /settings (API keys, team members, billing plan management)
│
├── components/
│   ├── ui/                            # Primitive UI components (Button, Card, Input, Badge, Dialog, Modal, Dropdown)
│   ├── marketing/                     # Navbar, HeroSection, ProblemSection, VideoLightbox, HowItWorksSection, WaitlistSection, Footer
│   ├── docs/                          # DocsSidebar, DocsBreadcrumb, CodeBlockWithCopy
│   └── dashboard/                     # ScanCard, SeverityBadge, VulnerabilityDetail, QuickScanModal
│
├── public/
│   └── assets/                        # Downloaded Relume assets (hero-terminal.webp, demo-dashboard.webp, shield-graphic.webp, logo.svg)
│
├── lib/
│   ├── mock-data.ts                   # Structured mock data for scans, changelog, and documentation
│   └── utils.ts                       # Class names helper (cn)
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 3. Detailed Page Breakdown & Features

### 3.1 Marketing Route Group `(marketing)`
- **Header / Navigation (`Navbar.tsx`)**:
  - Floating pill design with glassmorphic backdrop (`backdrop-blur-md`, subtle border, shadow).
  - Brand logo with home link.
  - Links: *The problem* (`/#problem`), *How it works* (`/#how-it-works`), *Demo* (`/#demo`), *Pricing* (`/pricing`), *Docs* (`/docs`).
  - Primary Action Button: *Join the waitlist* / *Sign in* (`/login`).
  - Mobile hamburger toggle with smooth animated icon and dropdown sheet.
- **Home Landing Page (`/`)**:
  - **Hero Header**: "Security scanning for vibe-coded apps" tagline badge, bold headline, descriptive lead copy, CTA button, and high-res terminal scan screenshot.
  - **The Problem Section**: 3-column vulnerability highlights with icons: *Exposed API keys*, *Missing authentication checks*, *Unprotected database rules*.
  - **Product Demo Section**: "See a scan run end to end" with interactive Video Lightbox component (click triggers video modal popup with backdrop blur and controls).
  - **How It Works Section**: "Scan, reason, report" 3-phase structured breakdown.
  - **Early Access Waitlist Section**: Email input form with real-time validation, loading state, success banner ("You're on the list. We'll be in touch."), and shield artwork.
  - **Footer**: Brand logo, column links to all product sections, copyright (`© 2026 VibeScan. All rights reserved.`), and Privacy / Terms links.
- **Pricing (`/pricing`)**:
  - Three plan tiers: **Free** ($0/mo), **Pro** ($19/mo or $190/yr), **Team** ($49/mo or $490/yr).
  - Feature lists with checkmark iconography.
  - Detailed feature-by-feature comparison section (*Scans per month*, *GitHub Action*, *Support*).
- **Changelog (`/changelog`)**:
  - Release timeline with version tags: `v0.4.0` (Aug 2026), `v0.3.0` (Jul 2026), `v0.2.0` (Jun 2026).
- **Legal (`/terms` & `/privacy`)**:
  - Clean document layouts covering Terms of Service and Privacy Policy.

### 3.2 Documentation Section `/docs`
- Dedicated documentation layout with responsive sticky left sidebar.
- Navigation tree:
  - **Getting Started**: Overview of VibeScan CLI and cloud scanner.
  - **Installation (`/docs/installation`)**: `npm install -g vibescan`, Node 18+ requirements, environment setup.
  - **GitHub Action (`/docs/github-action`)**: Sample `.github/workflows/vibescan.yml` config.
  - **Understanding Reports (`/docs/understanding-reports`)**: How severity scoring (Critical, High, Medium, Low) and AI-assisted Reason pass works.
  - **FAQ (`/docs/faq`)**: Common questions on privacy, codebase security, and false positives.
- Interactive code blocks with single-click clipboard copying.

### 3.3 Authentication `(auth)`
- Minimal, clean card layout.
- **Login (`/login`)**: "Continue with GitHub" OAuth button + Email and password sign-in form with validation.
- **Signup (`/signup`)**: New account registration form with password strength indicator.

### 3.4 Dashboard & Scan Explorer `(dashboard)`
- Authenticated dashboard layout with top bar, repository switcher, and quick scan trigger.
- **Dashboard Home (`/dashboard`)**:
  - High-level metrics: Total Scans, Open Vulnerabilities, Resolved Findings, Protected Repos.
  - Recent Scans list with status badges (Passing, Failed, Critical Findings).
- **Scan Detail View (`/scans/[scanId]`)**:
  - Header with repo name, commit hash, scan duration, and severity summary pills.
  - List of vulnerability findings:
    - Finding Title & Severity Badge (e.g., `CRITICAL: Hardcoded OpenAI API Key`).
    - File path and Line number (e.g., `src/api/generate.ts:24`).
    - Plain-language explanation of why it is vulnerable.
    - AI-assisted remediation code diff showing exact fix.
- **Settings (`/settings`)**:
  - API Keys management for CI/CD and CLI integrations.
  - Plan and seat usage.

---

## 4. UI/UX Design System & Polish
- **Color Tokens**:
  - Background: Neutral White (`#ffffff`) & Subtle Off-White (`#f9fafb` / `#f3f4f6`) for light sections; Deep Onyx (`#0f172a` / `#0a0a0a`) for dark UI cards and terminal blocks.
  - Text: Dark Charcoal (`#111827`), Muted Grey (`#6b7280`), High-Contrast White (`#f8fafc`).
  - Accent: Primary Dark (`#18181b` / `#000000`), Subtle Border (`#e5e7eb` / `#e2e8f0`).
- **Typography**: Google Font `Inter` with weights 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold).
- **Icons**: Lucide React icons matching Relume's Material Symbols.
- **Micro-Interactions**: Hover lifts on buttons and cards, smooth modal transitions, sticky navbar pill animations, and accessible keyboard focus states.

---

## 5. Verification Plan
- Verify all routes render without errors (`/`, `/pricing`, `/changelog`, `/terms`, `/privacy`, `/docs`, `/docs/installation`, `/docs/github-action`, `/docs/understanding-reports`, `/docs/faq`, `/login`, `/signup`, `/dashboard`, `/scans/scan-001`, `/settings`).
- Verify responsive layout on Mobile (375px), Tablet (768px), and Desktop (1280px+).
- Verify interactive elements: mobile navbar toggle, video lightbox modal, waitlist form submission, docs code copy buttons.
- Build and run validation tests.
