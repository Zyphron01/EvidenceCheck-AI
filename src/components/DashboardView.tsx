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
  Sparkles,
  ExternalLink,
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
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUPPORTED</span>
          </span>
        );
      case "REFUTED":
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>REFUTED</span>
          </span>
        );
      case "CONTRADICTORY":
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>CONTRADICTORY</span>
          </span>
        );
      case "INSUFFICIENT_EVIDENCE":
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700">
            <HelpCircle className="w-3 h-3" />
            <span>INSUFFICIENT EVIDENCE</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center space-x-2.5 tracking-tight">
            <Database className="w-6 h-6 text-[#23C9C5]" />
            <span>Investigation Observatory</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Audit logs and persistent investigation records stored in PostgreSQL and local verified archives.
          </p>
        </div>

        <button
          onClick={onOpenArchive}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#192739] hover:bg-[#22354e] text-[#23C9C5] text-xs font-bold border border-[#23C9C5]/30 shadow-lg shadow-[#23C9C5]/5 transition-all"
        >
          <Archive className="w-4 h-4" />
          <span>Inspect Speed of Light Benchmark (Phase 2.5)</span>
        </button>
      </div>

      {/* Database Persistence Status Alert */}
      {!databaseConfigured && (
        <div className="bg-amber-950/15 border border-amber-500/30 rounded-2xl p-5 text-xs space-y-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Durable PostgreSQL Persistence Status: Unconfigured</span>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            {blocker ||
              "DATABASE_URL is not set in environment variables. Multi-user PostgreSQL persistence is disabled. Investigations run in ephemeral memory."}
          </p>
          <div className="pt-2 text-[11px] text-zinc-400 border-t border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong>Recommended Setup:</strong> Neon Serverless Postgres (`DATABASE_URL=&quot;postgres://...?sslmode=require&quot;`).
            </span>
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#23C9C5] hover:underline inline-flex items-center space-x-1 font-semibold"
            >
              <span>Explore Neon.tech</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#23C9C5]" />
          <span>Stored Investigation Reports ({reports.length})</span>
        </h3>

        {isLoading ? (
          <div className="p-12 text-center bg-[#111B2A]/60 rounded-2xl border border-zinc-800">
            <Loader2 className="w-6 h-6 text-[#23C9C5] animate-spin mx-auto mb-2.5" />
            <p className="text-xs text-zinc-400 font-medium">Loading stored investigations...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center bg-[#111B2A]/60 rounded-2xl border border-zinc-800 space-y-3">
            <Database className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-200">No Stored Reports Found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                No investigations have been persisted to PostgreSQL yet. Submit a new claim or inspect the verified live archive.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-[#111B2A]/70 overflow-hidden shadow-2xl backdrop-blur-md">
            {reports.map((item) => (
              <div
                key={item.id}
                className="p-5 hover:bg-[#192739]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getVerdictBadge(item.verdictStatus)}
                    <span className="text-xs font-mono font-bold text-[#23C9C5]">
                      Score: {item.confidence.toFixed(2)}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[10px] font-mono font-medium text-zinc-400 px-2.5 py-0.5 rounded-full bg-[#080D16] border border-zinc-800">
                      {item.source === "verified_live_archive" ? "Verified Live Archive" : "PostgreSQL"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-zinc-100 leading-snug">
                    &ldquo;{item.claimText}&rdquo;
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                    <span>•</span>
                    <span className="truncate max-w-xs">{item.id}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectReportId(item.id)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#23C9C5] hover:bg-[#1db3af] text-zinc-950 text-xs font-bold transition-all shrink-0 self-start sm:self-center shadow-md shadow-[#23C9C5]/10"
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
