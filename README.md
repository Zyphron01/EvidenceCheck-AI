# EvidenceCheck AI 🛡️✨

> **Citation-Audited, Contradiction-Aware Evidence Intelligence Platform**  
> *Audit factual claims with verifiable proof, bidirectional retrieval, and deterministic citation validation.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![NVIDIA Nemotron](https://img.shields.io/badge/NVIDIA-Nemotron_120B-76b900?logo=nvidia)](https://build.nvidia.com/)
[![Tavily Search](https://img.shields.io/badge/Tavily-Dual_Search-purple)](https://tavily.com/)
[![Tests](https://img.shields.io/badge/Tests-57%20Passing-success)](https://github.com/Zyphron01/EvidenceCheck-AI)

---

## 🌟 Overview

**EvidenceCheck AI** is a production-grade automated fact investigation and evidence auditing platform. When a user submits a factual assertion, the engine:

1. **Plans Dual Search Queries**: Uses **NVIDIA Nemotron 120B** to draft neutral confirmation and adversarial counter-evidence search queries to prevent confirmation bias.
2. **Retrieves Real-World Evidence**: Dispatches rate-budgeted requests via **Tavily Search** across academic, scientific, and authoritative web domains.
3. **Segments Atomic Passages**: Extracts text into addressable passage records (`psg-1`, `psg-2`, etc.) with strict character offsets.
4. **Analyzes Evidential Contradictions**: Evaluates passage stances (`SUPPORTING`, `CONTRADICTING`, `NEUTRAL`) and detects mutual exclusivity.
5. **Deterministically Audits Quotations**: Validates cited quotes against retrieved snippets using contiguous substring checks; hallucinated ellipses and paraphrasing artifacts are rejected.
6. **Synthesizes Forensic Verdicts**: Computes an evidence-grounded verdict (`SUPPORTED`, `REFUTED`, `CONTRADICTORY`, or `INSUFFICIENT_EVIDENCE`) and a transparent **Heuristic Support Index** (0.00 – 1.00).

---

## 🔬 Core Innovations

- **Zero-Hallucination Citation Gate**: LLM citations must match exact substrings in retrieved snippets. Any quote containing hallucinated text or ellipses fails audit and is prominently labeled with rejection proof.
- **Fail-Closed Verification Engine**: If evidence is thin or unverified, the engine enforces `INSUFFICIENT_EVIDENCE` with `confidence: 0.0`. It never equates a single verified quote with absolute truth.
- **Interactive Evidence Constellation DAG**: An interactive 4-stage visual trajectory:
  $$\text{Claim} \longrightarrow \text{Sources (4)} \longrightarrow \text{Passages (20)} \longrightarrow \text{Audited Citations (3)} \longrightarrow \text{Verdict}$$
- **Real-Time Forensic Inspector**: Click any node in the graph to inspect character offsets, verbatim snippets, source metadata, and quote verification status.
- **Multi-Instance Search Credit Protection**: Durable daily usage budgets with atomic slot reservation to safeguard provider API credits.

---

## 🧪 Authentic Benchmark Run (Phase 2.5 Live Execution)

The core pipeline has been end-to-end verified against real NVIDIA and Tavily endpoints:

- **Claim**: *"The speed of light in a vacuum is approximately 299,792 kilometers per second."*
- **Status**: `SUPPORTED`
- **Heuristic Support Index**: `0.75 / 1.00`
- **Retrieved Sources**: 4 independent authoritative sources (Wikipedia, PhysicsFundamentals, Physics StackExchange, UC Riverside)
- **Passages Extracted**: 20 atomic segmented passages
- **Quotation Audit**: 2 verified quotes, 1 rejected citation (detected non-contiguous formatting ellipsis `...`)
- **Execution Time**: `32.5 seconds`
- **Provenance**: Authentically saved and permanently viewable via the **Verified Run** tab in the UI.

---

## 🏗️ Architecture

```
User Claim
   │
   ▼
[ Query Planner ] ────────────► NVIDIA Nemotron 120B
   │ (Neutral & Adversarial Queries)
   ▼
[ Web Retriever ] ────────────► Tavily Search API (Dual Retrieval)
   │ (Raw HTML / Snippets)
   ▼
[ Passage Processor ] ────────► Atomic Segmentation & Character Offsets
   │ (Indexed Passages)
   ▼
[ Contradiction Analyzer ] ───► NVIDIA Nemotron 120B (Stance Classification)
   │ (Tension Arcs & Classifications)
   ▼
[ Deterministic Auditor ] ────► Exact Substring Validation (Zero Hallucinations)
   │ (Pass/Fail Audits)
   ▼
[ Verdict Engine ] ───────────► Support Index & Mathematical Synthesis
   │
   ▼
Interactive Evidence Constellation UI (Next.js 16 + Tailwind v4 + CDP Inspected)
```

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Zyphron01/EvidenceCheck-AI.git
cd EvidenceCheck-AI
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the required provider keys in `.env`:

```ini
# NVIDIA NIM Inference
NVIDIA_API_KEY=your_nvidia_nim_key
NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Tavily Search API
TAVILY_API_KEY=your_tavily_key
TAVILY_BASE_URL=https://api.tavily.com
TAVILY_MAX_SEARCHES=20

# Optional PostgreSQL Storage (e.g. Neon, Supabase)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the interactive experience.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🧪 Automated Test Suite

EvidenceCheck AI includes an exhaustive test suite covering runtime HTTP security, unit schemas, provider error parsers, and headless browser automation:

```bash
# Run backend verification suite (57 tests)
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint audit
npm run lint

# Run headless Chrome browser audit (16 checks + CDP metrics)
node tests/run-browser-audit.mjs
```

### Test Coverage Highlights:
- **57 Passing Automated Tests** across `tests/runtime.test.mjs` and `tests/phase2.test.mjs`
- **16 Passing Real Browser Checks** with screenshots saved in `tests/screenshots/`
- Rate-limiting (6 req/min token bucket), in-flight deduplication, and zero-key leakage tests
- Fallback handling for cold PostgreSQL pools and serverless cold boots

---

## 📁 Project Structure

```
├── docs/                        # Architecture & Research Documentation
│   ├── DESIGN_RESEARCH.md       # Awwwards & interactive web research
│   └── DEPLOYMENT.md            # Production deployment guidelines
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── investigate/     # Main investigation API route
│   │   │   └── reports/         # Report persistence & retrieval routes
│   │   ├── globals.css          # Tailwind CSS v4 design system
│   │   ├── layout.tsx           # Dark-mode root layout & meta tags
│   │   └── page.tsx             # Interactive application entrypoint
│   ├── components/
│   │   ├── ConstellationCanvas.tsx      # Procedural 2.5D orbital background
│   │   ├── EvidenceCheckHeader.tsx      # Responsive navigation & status
│   │   ├── EvidenceReportView.tsx       # Forensic report & verdict presentation
│   │   ├── InteractiveEvidenceTrail.tsx # 4-stage constellation DAG & inspector
│   │   ├── DashboardView.tsx            # Investigation observatory & history
│   │   └── InvestigationProgress.tsx    # Multi-stage progress indicator
│   ├── data/
│   │   └── verified-archive.ts          # Authentic Phase 2.5 Speed of Light benchmark
│   └── lib/
│       ├── ai/                  # NVIDIA Nemotron client & error handling
│       ├── search/              # Tavily search client & credit protection
│       ├── passage/             # Atomic passage segmenter & indexer
│       ├── audit/               # Deterministic quotation audit engine
│       ├── verdict/             # Mathematical verdict synthesis
│       ├── db/                  # PostgreSQL durable storage & budget tracking
│       └── schemas/             # Zod validation schemas
└── tests/                       # Complete automated verification suite
```

---

## 🔒 Security & Privacy

- **Zero Secret Leakage**: API keys and authorization headers are strictly isolated to server-side Node.js execution.
- **Untrusted Web Content Sanitization**: All retrieved web snippets are wrapped in isolated XML containers before reaching LLM analysis to prevent prompt injection.
- **Fail-Closed Provider Protection**: In-memory and PostgreSQL token budgets prevent unexpected provider overages.
- **Non-Calibrated Probability Disclaimer**: Numeric scores are explicitly designated as heuristic support indices, not statistical probability.

---

## 📄 License

MIT License. Built for rigorous factual evidence verification.
