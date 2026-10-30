# EvidenceCheck AI — Production Deployment Guide

## 1. Overview
EvidenceCheck AI is built on Next.js 16 App Router. It coordinates bidirectional web search retrieval with Tavily, extracts and indexes atomic passages, synthesizes findings with NVIDIA Nemotron 120B, and deterministically validates quotations against retrieved passages.

---

## 2. Serverless Execution Budget & Vercel Fluid Compute

### Observed Execution Duration
- In the verified live investigation run, end-to-end execution took **32,544 ms (32.5 seconds)**.
- Breakdown:
  1. Nemotron Query Planner: ~2–4 seconds
  2. Dual Tavily Search: ~2–3 seconds
  3. Passage extraction & deduplication: < 100 ms
  4. Nemotron Passage Analysis & Citation Drafting: ~20–25 seconds
  5. Citation auditing & verdict computation: < 50 ms

### Vercel Fluid Compute Compatibility
- **Fluid Compute on Vercel**: Vercel's Fluid Compute architecture supports execution durations of **up to 300 seconds (5 minutes)** for Node.js Serverless Functions across both **Hobby and Pro** tiers.
- **Route Configuration**: `src/app/api/investigate/route.ts` specifies:
  ```typescript
  export const maxDuration = 60; // 60 seconds execution budget
  export const dynamic = "force-dynamic";
  ```
- **How to verify Fluid Compute**:
  1. Open your Vercel Project Dashboard.
  2. Navigate to **Settings > Functions**.
  3. Ensure **Fluid Compute** is enabled (default for modern Next.js deployments).
  4. Max function duration will reflect up to 300s.

---

## 3. Required Environment Variables

Configure these in your production host (e.g. Vercel Project Settings > Environment Variables):

| Variable | Description | Required | Example / Default |
| :--- | :--- | :--- | :--- |
| `NVIDIA_API_KEY` | API key for NVIDIA NIM API | **Yes** | `nvapi-...` |
| `NVIDIA_MODEL` | Confirmed Nemotron model ID | **Yes** | `nvidia/nemotron-3.5-super-vl-120b-a12b` |
| `NVIDIA_BASE_URL` | Base URL for NVIDIA completions | No | `https://integrate.api.nvidia.com/v1` |
| `TAVILY_API_KEY` | API key for Tavily Search | **Yes** | `tvly-...` |
| `TAVILY_MAX_SEARCHES` | Per-instance search budget ceiling | No | `20` (defaults to 20) |
| `DATABASE_URL` | PostgreSQL connection string | Recommended | `postgres://user:password@host:5432/db?sslmode=require` |
| `PUBLIC_LIVE_INVESTIGATION_ENABLED` | Public live search gate | No (default `false`) | `true` or `false` |

---

## 4. Credit Protection Safeguards (Fail-Closed Architecture)

Because serverless instances do not share in-memory state, unrestricted public endpoints risk runaway API credit consumption. EvidenceCheck AI enforces strict multi-layered credit protection:

1. **Public Deployment Safety Gate (`PUBLIC_LIVE_INVESTIGATION_ENABLED`)**:
   - In production (`NODE_ENV === "production"`), live external queries are **locked by default** (`HTTP 403 CREDIT_PROTECTION_LOCKED`).
   - Users can explore the pre-verified live archive report without consuming any API credits.
2. **Durable Daily Search Budget (PostgreSQL)**:
   - When `PUBLIC_LIVE_INVESTIGATION_ENABLED=true` is set, the API requires `DATABASE_URL` and uses the `daily_usage_budgets` table to enforce an atomic daily search cap across all serverless instances.
3. **Fail-Closed Enforcement**:
   - If `DATABASE_URL` is unconfigured, database connection drops, or the daily budget is reached, outbound searches **fail closed** (`HTTP 429 BUDGET_EXHAUSTED` or `HTTP 403`), preventing credit leaks.

---

## 5. Recommended PostgreSQL Setup: Neon (Serverless Postgres)

For one-click serverless PostgreSQL with connection pooling:

1. Create a free account at [Neon.tech](https://neon.tech).
2. Create a new project (e.g. `evidencecheck-db`).
3. Copy the pooled connection string:
   ```
   DATABASE_URL="postgres://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. Run the database migration script below via Neon's SQL Editor:

```sql
-- 1. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(128) PRIMARY KEY,
    claim_id VARCHAR(128) NOT NULL,
    claim_text TEXT NOT NULL,
    verdict_status VARCHAR(64) NOT NULL,
    confidence NUMERIC(4,3) NOT NULL,
    summary TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    raw_report JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_verdict_status ON reports(verdict_status);

-- 2. Durable Cross-Instance Daily Search Budget Table
CREATE TABLE IF NOT EXISTS daily_usage_budgets (
    day_date VARCHAR(10) PRIMARY KEY, -- e.g. '2026-10-30'
    searches_consumed INTEGER NOT NULL DEFAULT 0,
    max_daily_searches INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Vercel Deployment Checklist

1. **Git Push**: Ensure repository is pushed with no `.env` or credential files committed (`git check-ignore -v .env`).
2. **Import to Vercel**: Connect GitHub repository.
3. **Environment Configuration**: Set `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `TAVILY_API_KEY`, and `DATABASE_URL`.
4. **Deploy**: Build runs with Next.js 16 App Router on Node.js 20.x/22.x LTS.
5. **Verify Live**:
   - Visit the public Vercel URL.
   - Click "Verified Run" to inspect the authentic Phase 2.5 Speed of Light report.
   - Check Dashboard to verify PostgreSQL persistence status.
