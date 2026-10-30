/**
 * EvidenceCheck AI — Report Persistence & Database Client
 *
 * Implements durable PostgreSQL report storage when DATABASE_URL is configured.
 * Strictly avoids browser localStorage.
 * When DATABASE_URL is absent, honestly reports the setup blocker.
 */

import type { EvidenceReport, VerdictStatus } from "../schemas/report.ts";
import { EvidenceReportSchema } from "../schemas/report.ts";
import { verifiedArchiveReport } from "../../data/verified-archive.ts";

export interface DatabaseStatus {
  configured: boolean;
  blocker?: string;
}

export interface ReportSummaryItem {
  id: string;
  claimText: string;
  verdictStatus: VerdictStatus;
  confidence: number;
  createdAt: string;
  source: "postgres" | "verified_live_archive";
}

export const SCHEMA_DDL = `
-- EvidenceCheck AI PostgreSQL Schema
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

-- Durable Cross-Instance Daily Search Budget Table
CREATE TABLE IF NOT EXISTS daily_usage_budgets (
    day_date VARCHAR(10) PRIMARY KEY, -- e.g. '2026-10-30'
    searches_consumed INTEGER NOT NULL DEFAULT 0,
    max_daily_searches INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export function getDatabaseStatus(): DatabaseStatus {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return {
      configured: false,
      blocker:
        "DATABASE_URL is not set in environment variables. Durable PostgreSQL storage is unconfigured. Set DATABASE_URL to enable persistent multi-user report storage.",
    };
  }
  return { configured: true };
}

// Minimal typings for PostgreSQL client to avoid hard build-time dependency when DATABASE_URL is unconfigured
interface PgQueryResult<T = Record<string, unknown>> {
  rows: T[];
}

interface PgPoolInstance {
  query: (sql: string, params?: unknown[]) => Promise<PgQueryResult>;
  end: () => Promise<void>;
}

interface PgModule {
  Pool: new (config: { connectionString?: string }) => PgPoolInstance;
}

async function loadPgDriver(): Promise<PgModule | null> {
  try {
    const moduleName = "pg";
    const imported = (await import(/* webpackIgnore: true */ moduleName)) as PgModule;
    return imported;
  } catch {
    return null;
  }
}

/**
 * Save report into PostgreSQL when DATABASE_URL is present.
 * Uses dynamic driver import so absence of database does not crash the server.
 */
export async function saveReport(report: EvidenceReport): Promise<{ saved: boolean; error?: string }> {
  const status = getDatabaseStatus();
  if (!status.configured) {
    return { saved: false, error: status.blocker };
  }

  try {
    const pg = await loadPgDriver();
    if (!pg) {
      return {
        saved: false,
        error: "PostgreSQL driver ('pg') is not installed. Run 'npm install pg' to enable database persistence.",
      };
    }

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    try {
      await pool.query(
        `INSERT INTO reports (id, claim_id, claim_text, verdict_status, confidence, summary, reasoning, raw_report, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          report.id,
          report.claim.id,
          report.claim.rawText,
          report.verdict.status,
          report.verdict.confidence,
          report.verdict.summary,
          report.verdict.reasoning,
          JSON.stringify(report),
          report.metadata.createdAt,
        ]
      );
      return { saved: true };
    } finally {
      await pool.end();
    }
  } catch (err: unknown) {
    return {
      saved: false,
      error: err instanceof Error ? err.message : "Database write error",
    };
  }
}

/**
 * Read the genuine verified live report stored on disk during Phase 2.5 / First Live Investigation.
 * Bundled statically at compile time for reliable serverless execution.
 */
export function getSavedLiveArchiveReport(): EvidenceReport | null {
  try {
    const validated = EvidenceReportSchema.safeParse(verifiedArchiveReport);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

/**
 * Fetch report by ID. First checks PostgreSQL if configured, then checks verified live archive.
 */
export async function getReportById(id: string): Promise<{
  report: EvidenceReport | null;
  source: "postgres" | "verified_live_archive" | null;
  error?: string;
}> {
  const dbStatus = getDatabaseStatus();

  if (dbStatus.configured) {
    try {
      const pg = await loadPgDriver();
      if (pg) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        try {
          const res = await pool.query(`SELECT raw_report FROM reports WHERE id = $1 LIMIT 1`, [id]);
          if (res.rows.length > 0) {
            const rawReport = res.rows[0].raw_report;
            const parsed = EvidenceReportSchema.safeParse(rawReport);
            if (parsed.success) {
              return { report: parsed.data, source: "postgres" };
            }
          }
        } finally {
          await pool.end();
        }
      }
    } catch (err: unknown) {
      return {
        report: null,
        source: null,
        error: err instanceof Error ? err.message : "Database query error",
      };
    }
  }

  // Fallback to verified live run archive if ID matches
  const archivedReport = getSavedLiveArchiveReport();
  if (archivedReport && archivedReport.id === id) {
    return { report: archivedReport, source: "verified_live_archive" };
  }

  return { report: null, source: null };
}

/**
 * List recent reports from PostgreSQL if configured, plus the genuine verified archive report.
 */
export async function listRecentReports(limit = 10): Promise<{
  reports: ReportSummaryItem[];
  databaseConfigured: boolean;
  blocker?: string;
}> {
  const dbStatus = getDatabaseStatus();
  const results: ReportSummaryItem[] = [];

  if (dbStatus.configured) {
    try {
      const pg = await loadPgDriver();
      if (pg) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        try {
          const res = await pool.query(
            `SELECT id, claim_text, verdict_status, confidence, created_at
             FROM reports
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
          );
          for (const row of res.rows) {
            results.push({
              id: String(row.id),
              claimText: String(row.claim_text),
              verdictStatus: row.verdict_status as VerdictStatus,
              confidence: Number(row.confidence),
              createdAt: new Date(String(row.created_at)).toISOString(),
              source: "postgres",
            });
          }
        } finally {
          await pool.end();
        }
      }
    } catch {
      // Continue to include archive report if DB query fails
    }
  }

  // Include the verified live archive run (Speed of Light, Oct 30 2026)
  const archived = getSavedLiveArchiveReport();
  if (archived && !results.some((r) => r.id === archived.id)) {
    results.push({
      id: archived.id,
      claimText: archived.claim.rawText,
      verdictStatus: archived.verdict.status,
      confidence: archived.verdict.confidence,
      createdAt: archived.metadata.createdAt,
      source: "verified_live_archive",
    });
  }

  return {
    reports: results,
    databaseConfigured: dbStatus.configured,
    blocker: dbStatus.blocker,
  };
}

/**
 * Atomically reserve searches in PostgreSQL daily_usage_budgets table.
 * Enforces cross-instance credit protection in serverless production environments.
 * Fails closed if storage is unavailable or budget is exhausted.
 */
export async function reserveDurableSearchBudget(
  searchesNeeded = 2,
  maxDaily = 20
): Promise<{ allowed: boolean; consumed?: number; error?: string }> {
  const dbStatus = getDatabaseStatus();
  if (!dbStatus.configured) {
    return {
      allowed: false,
      error: "Durable budget storage is unconfigured. DATABASE_URL is required for production credit protection (Fail-Closed).",
    };
  }

  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  try {
    const pg = await loadPgDriver();
    if (!pg) {
      return {
        allowed: false,
        error: "PostgreSQL driver not available. Cannot verify durable budget (Fail-Closed).",
      };
    }

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // Ensure budget table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_usage_budgets (
          day_date VARCHAR(10) PRIMARY KEY,
          searches_consumed INTEGER NOT NULL DEFAULT 0,
          max_daily_searches INTEGER NOT NULL DEFAULT 20,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Atomic reservation query
      const res = await pool.query(
        `INSERT INTO daily_usage_budgets (day_date, searches_consumed, max_daily_searches)
         VALUES ($1, $2, $3)
         ON CONFLICT (day_date) DO UPDATE
         SET searches_consumed = daily_usage_budgets.searches_consumed + $2,
             updated_at = NOW()
         WHERE daily_usage_budgets.searches_consumed + $2 <= daily_usage_budgets.max_daily_searches
         RETURNING searches_consumed, max_daily_searches;`,
        [todayStr, searchesNeeded, maxDaily]
      );

      if (res.rows.length === 0) {
        return {
          allowed: false,
          error: `Daily search limit reached (${maxDaily} searches/day). Live investigations are locked for today to protect provider credits.`,
        };
      }

      return {
        allowed: true,
        consumed: Number(res.rows[0].searches_consumed),
      };
    } finally {
      await pool.end();
    }
  } catch (err: unknown) {
    // Fail-Closed: any database connection or query error blocks the outbound search
    return {
      allowed: false,
      error: `Failed to verify durable credit budget: ${err instanceof Error ? err.message : "Database error"} (Fail-Closed).`,
    };
  }
}

