"use client";

import React, { useEffect, useState } from "react";
import type { ReportSummaryItem } from "@/lib/db/storage";
import {
  Database,
  AlertCircle,
  Archive,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
} from "lucide-react";

interface DashboardProps {
  onSelectReportId: (id: string) => void;
  onOpenArchive: () => void;
}

export function DashboardView({ onSelectReportId, onOpenArchive }: DashboardProps) {
  const [reports, setReports] = useState<ReportSummaryItem[]>([]);
  const [databaseConfigured, setDatabaseConfigured] = useState<boolean>(false);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setReports(json.data.reports || []);
            setDatabaseConfigured(Boolean(json.data.databaseConfigured));
            setBlocker(json.data.blocker || null);
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getVerdictBadge = (status: string) => {
    switch (status) {
      case "SUPPORTED":
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUPPORTED</span>
          </span>
        );
      case "REFUTED":
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>REFUTED</span>
          </span>
        );
      case "CONTRADICTORY":
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>CONTRADICTORY</span>
          </span>
        );
      case "INSUFFICIENT_EVIDENCE":
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
            <HelpCircle className="w-3 h-3" />
            <span>INSUFFICIENT EVIDENCE</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Investigation Dashboard</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real investigation records stored in persistent PostgreSQL and local verified archives.
          </p>
        </div>

        <button
          onClick={onOpenArchive}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
        >
          <Archive className="w-3.5 h-3.5 text-blue-400" />
          <span>Load Speed of Light Run (Phase 2.5)</span>
        </button>
      </div>

      {/* Database Persistence Status Alert */}
      {!databaseConfigured && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 sm:p-5 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Durable PostgreSQL Persistence Status: Unconfigured</span>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            {blocker ||
              "DATABASE_URL is not set in environment variables. Multi-user PostgreSQL persistence is disabled. Investigations run in ephemeral memory."}
          </p>
          <div className="pt-2 text-[11px] text-zinc-400 border-t border-amber-900/30">
            <strong>Production Setup Requirement:</strong> Set <code className="text-amber-200 bg-amber-950/50 px-1 py-0.5 rounded font-mono">DATABASE_URL=&quot;postgres://...&quot;</code> in your production environment (e.g. Supabase, Neon, or RDS) to enable durable report persistence.
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Stored Investigations ({reports.length})
        </h3>

        {isLoading ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800">
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Loading stored investigations...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800 space-y-3">
            <Database className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">No Stored Reports Found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No investigations have been persisted to PostgreSQL yet. Execute a claim investigation or view the verified live archive run.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {reports.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {getVerdictBadge(item.verdictStatus)}
                    <span className="text-xs font-mono text-zinc-400">
                      Score: {item.confidence.toFixed(2)}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                      {item.source === "verified_live_archive" ? "Verified Live Archive" : "PostgreSQL"}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-zinc-200">
                    &ldquo;{item.claimText}&rdquo;
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                    <span>•</span>
                    <span className="truncate max-w-xs">{item.id}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectReportId(item.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-zinc-700 transition-colors shrink-0 self-start sm:self-center"
                >
                  <span>Open Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

