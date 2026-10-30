"use client";

import React, { FormEvent, useRef, useState, useEffect } from "react";
import type { InvestigateApiResponse } from "@/types/investigation";
import type { EvidenceReport } from "@/lib/schemas/report";
import { EvidenceCheckHeader, type ActiveTab } from "@/components/EvidenceCheckHeader";
import { InvestigationProgress } from "@/components/InvestigationProgress";
import { EvidenceReportView } from "@/components/EvidenceReportView";
import { DashboardView } from "@/components/DashboardView";
import { ConstellationCanvas } from "@/components/ConstellationCanvas";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldCheck,
  Cpu,
} from "lucide-react";

export default function HomePage() {
  const [claim, setClaim] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("investigate");
  const [currentReport, setCurrentReport] = useState<EvidenceReport | null>(null);
  const [isArchiveReport, setIsArchiveReport] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [databaseConfigured, setDatabaseConfigured] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check database configuration status on mount
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDatabaseConfigured(Boolean(json.data.databaseConfigured));
          }
        }
      } catch {
        // Fallback
      }
    }
    checkDb();
  }, []);

  const handleExampleSelect = (exampleText: string) => {
    setClaim(exampleText);
    setClientError(null);
  };

  const handleLoadArchive = async () => {
    setIsLoading(true);
    setClientError(null);
    setApiError(null);
    try {
      const reportRes = await fetch("/api/reports/rep-9aa0e699-d2c5-46b6-8464-023e148b9c0b");
      if (reportRes.ok) {
        const reportJson = await reportRes.json();
        if (reportJson.success && reportJson.data?.report) {
          setCurrentReport(reportJson.data.report);
          setIsArchiveReport(true);
          setActiveTab("archive");
          setIsLoading(false);
          return;
        }
      }
      setClientError("Verified archive report could not be loaded from database/disk.");
    } catch (err: unknown) {
      setClientError(err instanceof Error ? err.message : "Failed to load archive.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReportById = async (id: string) => {
    setIsLoading(true);
    setClientError(null);
    setApiError(null);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.report) {
          setCurrentReport(json.data.report);
          setIsArchiveReport(json.data.source === "verified_live_archive");
          setActiveTab("investigate");
        } else {
          setClientError(json.error?.message || "Report could not be retrieved.");
        }
      } else {
        setClientError(`Failed to fetch report (HTTP ${res.status}).`);
      }
    } catch (err: unknown) {
      setClientError(err instanceof Error ? err.message : "Error fetching report.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const trimmedClaim = claim.trim();
    if (!trimmedClaim) {
      setClientError("Claim text cannot be empty.");
      return;
    }

    if (trimmedClaim.length < 5) {
      setClientError("Claim must be at least 5 characters long.");
      return;
    }

    if (isLoading) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setClientError(null);
    setApiError(null);
    setCurrentReport(null);
    setIsArchiveReport(false);
    setActiveTab("investigate");

    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claim: trimmedClaim }),
        signal: controller.signal,
      });

      const data: InvestigateApiResponse = await res.json();

      if (res.ok && data.success) {
        setCurrentReport(data.data);
      } else if (!data.success) {
        setApiError({
          code: data.error.code,
          message: data.error.message,
        });
      } else {
        setClientError(`Unexpected server response (HTTP ${res.status}).`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setClientError("Investigation aborted by user.");
      } else {
        setClientError(err instanceof Error ? err.message : "Network request failed.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelInvestigation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-[#080D16] text-[#EAF2F7] flex flex-col font-sans selection:bg-[#23C9C5]/30 selection:text-white relative">
      {/* Dynamic 2.5D Constellation Background */}
      <ConstellationCanvas />

      <EvidenceCheckHeader
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "archive") {
            handleLoadArchive();
          }
        }}
        databaseConfigured={databaseConfigured}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 relative z-10">
        {/* TAB 1: INVESTIGATE (HOME & INPUT VIEW) */}
        {activeTab === "investigate" && (
          <div className="space-y-12">
            {/* Input Hero Section */}
            {!currentReport && !isLoading && (
              <div className="max-w-4xl mx-auto space-y-10 text-center sm:text-left">
                {/* Hero Editorial Header */}
                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#111B2A] border border-[rgba(35,201,197,0.3)] text-[#23C9C5] text-xs font-semibold shadow-lg shadow-[#23C9C5]/5 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Evidence Constellation • Citation-Audited Verification Engine</span>
                  </div>

                  <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.1] max-w-3xl mx-auto">
                    Audit Factual Claims with{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#23C9C5] via-teal-300 to-emerald-400">
                      Verifiable Proof
                    </span>
                  </h1>

                  <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    EvidenceCheck AI coordinates bidirectional web retrieval via Tavily, extracts atomic passages, reasons over contradictions with Nemotron 120B, and deterministically validates quotations against retrieved text.
                  </p>
                </div>

                {/* Interactive Claim Input Capsule */}
                <form
                  onSubmit={handleSubmit}
                  className="bg-[#111B2A]/90 border border-[rgba(35,201,197,0.2)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-left backdrop-blur-xl relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="claim-input"
                      className="block text-xs font-bold uppercase tracking-wider text-[#23C9C5]"
                    >
                      Enter Factual Assertion to Investigate
                    </label>

                    <div className="relative">
                      <textarea
                        id="claim-input"
                        value={claim}
                        onChange={(e) => setClaim(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. The speed of light in a vacuum is approximately 299,792 kilometers per second..."
                        rows={4}
                        className="w-full p-4 bg-[#080D16] border border-zinc-800 rounded-2xl font-sans text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#23C9C5]/50 focus:border-[#23C9C5] transition-all resize-none shadow-inner"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-1">
                      <span className="text-[11px] font-mono">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl+Enter</kbd> to audit
                      </span>
                      <span className="font-mono text-[11px]">{claim.length} / 500</span>
                    </div>
                  </div>

                  {/* Submission & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                    <button
                      type="submit"
                      disabled={isLoading || claim.trim().length < 5}
                      className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-[#23C9C5] hover:bg-[#1db3af] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-sm font-bold rounded-xl shadow-lg shadow-[#23C9C5]/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Search className="w-4 h-4" />
                      <span>Investigate Claim</span>
                    </button>

                    <button
                      type="button"
                      data-testid="inspect-archive-btn"
                      onClick={handleLoadArchive}
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#192739] hover:bg-[#22354e] text-[#23C9C5] text-xs font-semibold rounded-xl border border-[#23C9C5]/30 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inspect Verified Run (Speed of Light)</span>
                    </button>
                  </div>
                </form>

                {/* Example Claim Pills */}
                <div className="space-y-2.5 text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Curated Investigation Benchmarks:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      "The speed of light in a vacuum is approximately 299,792 kilometers per second.",
                      "The Great Wall of China is visible from the Moon with the naked eye.",
                      "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        data-testid="example-pill"
                        onClick={() => handleExampleSelect(example)}
                        className="text-xs text-zinc-300 hover:text-white bg-[#111B2A]/80 hover:bg-[#192739] border border-zinc-800/80 hover:border-[#23C9C5]/50 rounded-xl px-3.5 py-2 text-left transition-all shadow-sm"
                      >
                        &ldquo;{example}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Locked Innovations Architecture Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-400 pt-4">
                  <div className="p-4 rounded-2xl bg-[#111B2A]/70 border border-zinc-800/80 space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center space-x-2 text-zinc-200 font-bold">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span>Bidirectional Retrieval</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Retriever searches both confirmation and adversarial counter-evidence via Tavily.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#111B2A]/70 border border-zinc-800/80 space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center space-x-2 text-zinc-200 font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#23C9C5]" />
                      <span>Deterministic Audit</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Every quotation is programmatically checked for exact substring match; hallucinations fail.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#111B2A]/70 border border-zinc-800/80 space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center space-x-2 text-zinc-200 font-bold">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span>Contradiction Engine</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Nemotron isolates evidential contradictions and enforces INSUFFICIENT_EVIDENCE when thin.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banners */}
            {clientError && (
              <div className="max-w-4xl mx-auto p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm rounded-2xl flex items-start space-x-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Validation Notice</strong>
                  <span>{clientError}</span>
                </div>
              </div>
            )}

            {apiError && (
              <div className="max-w-4xl mx-auto p-5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm rounded-2xl flex items-start space-x-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs bg-amber-900/50 px-2 py-0.5 rounded border border-amber-700/50 text-amber-200 font-bold">
                      {apiError.code}
                    </span>
                    <strong className="font-bold text-sm">Investigation Halted</strong>
                  </div>
                  <p className="leading-relaxed">{apiError.message}</p>
                </div>
              </div>
            )}

            {/* In-Flight Progress Indicator */}
            {isLoading && (
              <div className="max-w-4xl mx-auto">
                <InvestigationProgress
                  claim={claim}
                  onCancel={handleCancelInvestigation}
                />
              </div>
            )}

            {/* Active Report View */}
            {currentReport && !isLoading && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2">
                  <button
                    onClick={() => {
                      setCurrentReport(null);
                      setClaim("");
                    }}
                    className="inline-flex items-center space-x-2 text-xs font-semibold text-zinc-300 hover:text-white bg-[#111B2A] px-4 py-2 rounded-xl border border-zinc-800 hover:border-[#23C9C5]/40 transition-all shadow-sm"
                  >
                    <span>← New Investigation</span>
                  </button>

                  <span className="text-xs text-zinc-500 font-mono">
                    Evidence Engine v{currentReport.metadata.pipelineVersion}
                  </span>
                </div>

                <EvidenceReportView
                  report={currentReport}
                  archiveBadge={isArchiveReport}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VERIFIED RUN ARCHIVE */}
        {activeTab === "archive" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="max-w-4xl mx-auto p-16 text-center">
                <p className="text-sm text-zinc-400">Loading verified live investigation run...</p>
              </div>
            ) : currentReport ? (
              <EvidenceReportView report={currentReport} archiveBadge={true} />
            ) : (
              <div className="max-w-2xl mx-auto text-center p-10 bg-[#111B2A]/80 rounded-3xl border border-zinc-800 space-y-4 shadow-2xl backdrop-blur-xl">
                <Info className="w-10 h-10 text-[#23C9C5] mx-auto" />
                <h3 className="text-lg font-bold text-zinc-100">Verified Run Archive</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                  Inspect authentic output from the live Speed of Light benchmark executed against real NVIDIA and Tavily endpoints.
                </p>
                <button
                  onClick={handleLoadArchive}
                  className="px-5 py-2.5 bg-[#23C9C5] hover:bg-[#1db3af] text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-[#23C9C5]/10"
                >
                  Load Verified Run
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DASHBOARD */}
        {activeTab === "dashboard" && (
          <DashboardView
            onSelectReportId={handleSelectReportById}
            onOpenArchive={handleLoadArchive}
          />
        )}
      </main>

      <footer className="border-t border-zinc-900 bg-[#080D16]/90 py-8 text-xs text-zinc-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="font-semibold text-zinc-400">EvidenceCheck AI</span>
            <span className="mx-2">•</span>
            <span>Citation-Audited Contradiction-Aware Fact Verification</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center space-x-3">
            <span>Powered by NVIDIA Nemotron 120B & Tavily Search</span>
            <span>•</span>
            <span className="text-[#23C9C5]">Zero Hallucinated Citations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
