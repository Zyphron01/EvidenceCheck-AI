# EvidenceCheck AI — System Architecture & Implementation Plan

## 1. System Overview
EvidenceCheck AI is a citation-audited, contradiction-aware evidence investigation platform. A user submits a factual claim; the system coordinates bidirectional search query generation via Tavily, extracts and indexes atomic passages, synthesizes findings and analyzes contradictions with NVIDIA Nemotron, deterministically validates citations against source texts, and yields persistent audit-ready reports.

---

## 2. Implemented & Verified Architecture (Phase 1 & Phase 2)

In strict compliance with architectural constraints, only files containing working code or active documentation exist. No placeholder stubs or mock data fixtures are used.

### Implemented Files & Responsibilities

| File Path | Module | Responsibility | Verification Status |
| :--- | :--- | :--- | :--- |
| `src/lib/schemas/report.ts` | Schemas | Zod schemas and inferred TypeScript types for Claim, EvidenceSource, EvidencePassage, EvidenceCitation, Contradiction, EvidenceReport, Verdict (with explicit `INSUFFICIENT_EVIDENCE` status). | **Verified** |
| `src/types/investigation.ts` | Types | API request/response contracts and shared investigation types. | **Verified** |
| `src/lib/ai/nvidia.ts` | NVIDIA Client | Server-only OpenAI-compatible client targeting `https://integrate.api.nvidia.com/v1`, enforcing `NVIDIA_MODEL` requirement, timeout, and safe error masking. | **Verified** |
| `src/lib/research/tavily.ts` | Tavily Client | Server-only Tavily search client with atomic in-memory budget reservation, rollback, timeouts, safe error masking, and configuration validators. | **Verified** |
| `src/lib/ai/query-planner.ts` | Query Planner | Formulates bidirectional search queries (supporting + challenging) via Nemotron, validates output against `QueryPlanSchema`. | **Verified** |
| `src/lib/research/retrieval.ts` | Dual Retrieval | Coordinates dual Tavily search queries (max 2 searches, max_results=5), normalizes URLs, deduplicates sources, and tags stance origin (`SUPPORTING`, `CHALLENGING`, `BOTH`). | **Verified** |
| `src/lib/research/passages.ts` | Passage Processor | Extracts usable text into atomic passages with deterministic IDs (`psg-1`, `psg-2`) and character offset indices, extracts domains, and preserves exact source text without fabricating metadata. | **Verified** |
| `src/lib/ai/analyzer.ts` | Nemotron Analyzer | Prompts Nemotron (`nvidia/nemotron-3.5-super-vl-120b-a12b`) using `<untrusted_passages>` XML containers to classify stances, draft citations, and isolate contradictions. | **Verified** |
| `src/lib/verification/citations.ts` | Citation Auditor | Deterministically verifies cited passage IDs exist, validates exact quotes against source passages using normalized whitespace/smart quote matching, and flags unsupported claims. | **Verified** |
| `src/lib/verification/verdict.ts` | Verdict Engine | Deterministically computes `SUPPORTED`, `REFUTED`, `CONTRADICTORY`, or forces `INSUFFICIENT_EVIDENCE` (confidence 0.0) based on verified evidence counts (never invents confidence percentages). | **Verified** |
| `src/lib/investigation/pipeline.ts` | Pipeline Orchestrator | Coordinates the complete end-to-end investigation pipeline from query planning through retrieval, segmentation, analysis, citation auditing, and verdict assembly. | **Verified** |
| `src/lib/investigation/handler.ts` | Request Handler | Pure request handler executing in-memory rate limiting (5 req/min), duplicate in-flight claim locking, Zod request validation, configuration safety checks, and pipeline dispatch. | **Verified** |
| `src/lib/db/storage.ts` | Report Storage | PostgreSQL report persistence when `DATABASE_URL` is set; verified live archive retrieval; transparent setup blocker reporting when unconfigured. | **Verified** |
| `src/app/api/investigate/route.ts` | API Route | Next.js App Router route handler (`POST`), configured with `maxDuration = 60` for serverless function duration safety. | **Verified** |
| `src/app/api/reports/route.ts` | API Route | Next.js App Router route handler (`GET`) for listing stored and archived reports. | **Verified** |
| `src/app/api/reports/[id]/route.ts` | API Route | Next.js App Router route handler (`GET`) for retrieving report by ID. | **Verified** |
| `src/components/EvidenceCheckHeader.tsx` | Header Component | Top branding, system model/retriever specs, and tab switcher (`Investigate`, `Verified Run`, `Dashboard`). | **Verified** |
| `src/components/InvestigationProgress.tsx` | Progress Component | Transparent progress viewer displaying live elapsed seconds and real pipeline phases without fabricated completion states. | **Verified** |
| `src/components/EvidenceReportView.tsx` | Report Component | Premium report view displaying original claim, verdict status, heuristic support index disclosures, citation audit panel with `SEARCH_SNIPPET` scope, authentic source cards, and atomic passage explorer. | **Verified** |
| `src/components/DashboardView.tsx` | Dashboard Component | Dashboard listing actual stored reports, verified live archive link, and honest setup blocker alert when `DATABASE_URL` is absent. | **Verified** |
| `src/app/page.tsx` | Web Platform | Main judge-ready web application integrating claim submission, live progress handling, report viewing, and dashboard navigation. | **Verified** |
| `docs/DEPLOYMENT.md` | Deployment Guide | Serverless execution budget plan, required environment variables, Upstash rate limiting, and PostgreSQL schema. | **Active** |
| `tests/runtime.test.mjs` | Test Suite | 16 runtime tests covering input validation, rate limiting, concurrency locks, configuration checks, and budget guards. | **Verified** (16/16 pass) |
| `tests/phase2.test.mjs` | Test Suite | 41 deterministic tests covering query planning, URL deduplication, passage slicing, analyzer parsing, quote matching, verdict logic, request serialization, and error diagnostics. | **Verified** (41/41 pass) |
| `docs/ARCHITECTURE.md` | Architecture Doc | Active architectural specification, runtime audit records, and planned phase roadmap. | **Active** |

---

## 3. Evidence Pipeline Flow (Phase 2 Real Investigation Engine)

```
[ User Claim Input ]
        │
        ▼
[ Rate Limiter & Concurrency Lock ]  ──(Over limit or duplicate in-flight)──► HTTP 429
        │
        ▼
[ Zod Request Validation ]          ──(Invalid input length / malformed)───► HTTP 400
        │
        ▼
[ Configuration & Budget Gate ]      ──(Missing env vars)────────────────────► HTTP 503
                                     ──(Budget < 2 searches)────────────────► HTTP 429
        │
        ▼
[ Step 1: Query Planner ] (NVIDIA Nemotron)
  ├── Supporting Query (Hypothesis Confirmation)
  └── Challenging Query (Adversarial Counter-Hypothesis)
        │
        ▼
[ Step 2: Dual Tavily Retrieval ]
  ├── 1 Search for Supporting Query (max_results=5)
  ├── 1 Search for Challenging Query (max_results=5)
  └── Deduplication by normalized URL (tags merged sources as 'BOTH')
        │
        ▼
[ Step 3: Passage Processor ]
  ├── Assign Source IDs (src-1, src-2, ...)
  ├── Slice into atomic passages (psg-1, psg-2, ...)
  └── Retain exact raw text & character offsets (never fabricate metadata)
        │
   (If 0 passages) ──► Immediate INSUFFICIENT_EVIDENCE report (confidence 0.0)
        │
        ▼
[ Step 4: Nemotron Analyzer ] (Model: nvidia/nemotron-3.5-super-vl-120b-a12b)
  ├── Wrap passages in <untrusted_passages> XML container
  ├── Classify passage stances (SUPPORTING, CONTRADICTING, NEUTRAL)
  ├── Isolate evidential contradictions
  └── Draft citations with sentence and exactQuote
        │
        ▼
[ Step 5: Citation Auditor ] (Deterministic Verification)
  ├── Verify passageId actually exists in retained collection (or mark FAILED)
  ├── Verify exactQuote exists via normalized substring match (or mark FAILED)
  └── Verify stance alignment (a matching quote alone does not prove support)
        │
        ▼
[ Step 6: Verdict Engine ] (Deterministic Mathematical Computation)
  ├── If 0 verified citations or no supporting/contradicting passages:
  │     FORCE INSUFFICIENT_EVIDENCE (confidence: 0.0)
  ├── If direct contradiction or both supporting & contradicting verified passages:
  │     CONTRADICTORY (confidence: derived from balance of independent sources)
  ├── If supporting verified passages dominate:
  │     SUPPORTED (confidence: derived from source diversity + verified citations)
  └── If contradicting verified passages dominate:
        REFUTED (confidence: derived from source diversity + verified citations)
        │
        ▼
[ Final EvidenceReport ] (Validated against EvidenceReportSchema)
```

---

## 4. Tavily Usage Budget Architecture & Concurrency Analysis

### Atomic Slot Reservation Pattern (Race Condition Mitigation)
- **Vulnerability**: An initial naive counter (`inMemorySearchCount += 1` after search completion) left a time-of-check to time-of-use (TOCTOU) race condition where concurrent requests could evaluate `budget.exhausted === false` simultaneously and overspend the quota before the counter incremented.
- **Remediation**: Implemented `reserveTavilySearchSlot()` which atomically checks and increments the counter prior to dispatching any network request. If a request subsequently fails, `releaseTavilySearchSlot()` is called to rollback the reservation.
- **Dual Retrieval Quota**: Each investigation requires exactly 2 Tavily searches. `executeDualRetrieval()` checks `budget.remaining >= 2` before initiating searches.

### Per-Instance Limitations & Migration Strategy
- **Per-Instance Scope**: The in-memory counter is local to the Node.js process. In clustered, containerized, or serverless environments (e.g. AWS Lambda, Vercel), each instance maintains an independent counter, and process restarts or cold boots reset the tally to zero.
- **Persistent Migration**: In Phase 3, this budget will transition to an atomic PostgreSQL table (`usage_budgets`) using row-level locks or decrement operations, providing durable, multi-instance spending caps.

---

## 5. Planned-But-Not-Yet-Built Files (Phase 3 & Phase 4)

The following files are mapped for development in subsequent phases. Per project rules, they have intentionally **not** been created as empty stubs:

| Planned File Path | Phase | Intended Responsibility |
| :--- | :--- | :--- |
| `src/lib/db/reports.ts` | Phase 3 | Persistent CRUD operations for reports, queries, and persistent usage counters using Postgres. |
| `src/app/dashboard/page.tsx` | Phase 3 | Investigation history dashboard, search usage meter, and report filter views. |
| `src/app/report/[id]/page.tsx` | Phase 3 | Comprehensive report viewer displaying the Verified Evidence Trail, passage highlights, and citation sidecards. |
| `src/app/api/reports/[id]/route.ts` | Phase 3 | REST API endpoint for retrieving persistent reports by ID. |
| `src/components/layout/*` | Phase 3 | UI navigation header, status bar, and footer components. |
| `src/components/investigation/*` | Phase 3 | Active investigation progress stepper, real-time query stream viewer, and passage inspector. |
| `src/components/report/*` | Phase 3 | Verdict badge, interactive citation highlights, contradiction breakdown, and source inspector. |
| `extension/*` (Manifest V3) | Phase 4 | Chrome extension content script and popup allowing one-click claim highlighting and sidecar verification. |

---

## 6. Deferred Database Schema Design (Provider-Agnostic PostgreSQL)

Database operations and client dependencies remain deferred. When enabled in Phase 3, the relational schema will adhere to the following provider-agnostic DDL design:

```sql
-- 1. Claims Table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_claims_normalized ON claims(normalized_text);

-- 2. Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    verdict_status VARCHAR(32) NOT NULL, -- SUPPORTED, REFUTED, CONTRADICTORY, INSUFFICIENT_EVIDENCE
    confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    verdict_summary TEXT NOT NULL,
    verdict_reasoning TEXT NOT NULL,
    insufficient_reason TEXT,
    model_used VARCHAR(128),
    searches_conducted INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_claim ON reports(claim_id);

-- 3. Evidence Sources Table
CREATE TABLE evidence_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    external_id VARCHAR(64) NOT NULL, -- e.g. "src-1"
    url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT,
    published_date VARCHAR(64),
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Evidence Passages Table
CREATE TABLE evidence_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
    external_id VARCHAR(64) NOT NULL, -- e.g. "psg-1"
    passage_text TEXT NOT NULL,
    stance VARCHAR(32) NOT NULL, -- SUPPORTING, CONTRADICTING, NEUTRAL
    char_offset_start INTEGER,
    char_offset_end INTEGER
);

-- 5. Evidence Citations Table
CREATE TABLE evidence_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES evidence_passages(id) ON DELETE CASCADE,
    sentence_text TEXT NOT NULL,
    exact_quote TEXT,
    validation_status VARCHAR(32) NOT NULL -- VERIFIED, UNVERIFIED, FAILED
);

-- 6. Contradictions Table
CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL, -- DIRECT, NUANCED, CONTEXTUAL
    supporting_passage_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradicting_passage_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 7. Durable Usage Budgets Table
CREATE TABLE usage_budgets (
    period_key VARCHAR(64) PRIMARY KEY, -- e.g. "global_total" or "2026-10"
    searches_allocated INTEGER NOT NULL,
    searches_consumed INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Security & Credential Boundary Enforcement

1. **Isolation**: All AI (`nvidia.ts`) and search (`tavily.ts`) interactions are strictly located in server-side modules (`src/lib/*` called only by App Router route handlers). No API keys or internal endpoints are exposed to client components.
2. **Untrusted Data Handling**: Web search snippets and raw contents from Tavily are treated as completely untrusted text. Prompting architectures isolate search passages inside delineated XML tags (`<untrusted_passage>`) and instruct the LLM to ignore any instructions embedded within external text.
3. **Confirmed Model ID**: Configured with `nvidia/nemotron-3.5-super-vl-120b-a12b`.
4. **Environment Isolation**: `.gitignore` prevents inadvertent leakage of any `.env.local` files.

---

## 8. NVIDIA Nemotron Request Serialization & Diagnostics

1. **Root Cause of HTTP 400**:
   Direct `fetch` requests sent to NVIDIA NIM API (`https://integrate.api.nvidia.com/v1/chat/completions`) wrapped custom reasoning controls inside an `extra_body: { chat_template_kwargs: { enable_thinking: false } }` container. While `extra_body` is a parameter recognized by the OpenAI client SDK, NVIDIA NIM's API endpoint is implemented with strict schema validation (FastAPI / Pydantic) and rejects unrecognized fields (`extra_body`) with `HTTP 400 Bad Request`.
2. **Correct Request Serialization (`buildNemotronRequestBody`)**:
   - `chat_template_kwargs: { enable_thinking: false }` is serialized directly at the root of the JSON payload.
   - No `extra_body` wrapper is present in the raw HTTP JSON.
   - Recommended sampling parameters are explicitly set: `temperature: 1`, `top_p: 0.95`, `stream: false`, with bounded `max_tokens` (1024 for query planning, 4096 for passage analysis).
3. **Safe Error Parsing (`parseNvidiaErrorResponse`)**:
   - Captures status code, provider error code/type, sanitized short validation message, and rejected parameter name.
   - Logs diagnostics only server-side without leaking API keys, headers, prompt text, or retrieved evidence passages.
