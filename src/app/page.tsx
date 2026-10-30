"use client";

import { FormEvent, useRef, useState, useEffect } from "react";
import type { InvestigateApiResponse } from "@/types/investigation";
import type { EvidenceReport } from "@/lib/schemas/report";
import { EvidenceCheckHeader, type ActiveTab } from "@/components/EvidenceCheckHeader";
import { InvestigationProgress } from "@/components/InvestigationProgress";
import { EvidenceReportView } from "@/components/EvidenceReportView";
import { DashboardView } from "@/components/DashboardView";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
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

  // Check database status on mount (server-side check via lightweight endpoint)
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
        // Ignore network check errors
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
      const res = await fetch("/api/reports");
      if (res.ok) {
        const json = await res.json();
        const archiveItem = json?.data?.reports?.find(
          (r: { source: string }) => r.source === "verified_live_archive"
        );
        if (archiveItem) {
          const reportRes = await fetch(`/api/reports/${archiveItem.id}`);
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
        }
      }
      setClientError("Verified archive report could not be loaded from disk.");
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* TAB 1: INVESTIGATE (HOME & INPUT VIEW) */}
        {activeTab === "investigate" && (
          <div className="space-y-10">
            {/* Input Hero Section (hidden if a report is already active and not loading) */}
            {!currentReport && !isLoading && (
              <div className="max-w-3xl mx-auto space-y-8 text-center sm:text-left">
                <div className="space-y-3 text-center">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Locked Innovation: Bidirectional Retrieval & Deterministic Quotation Audit</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-100">
                    Audit Factual Claims with Verifiable Evidence
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
                    EvidenceCheck AI retrieves opposing and supporting evidence via Tavily, analyzes contradictions with Nemotron 120B, and verifies exact citations against source snippets.
                  </p>
                </div>

                {/* Claim Input Form */}
                <form
                  onSubmit={handleSubmit}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-left"
                >
                  <div>
                    <label
                      htmlFor="claim-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                    >
                      Enter Factual Claim to Investigate
                    </label>
                    <textarea
                      id="claim-input"
                      value={claim}
                      onChange={(e) => setClaim(e.target.value)}
                      placeholder="e.g. The speed of light in a vacuum is approximately 299,792 kilometers per second..."
                      rows={4}
                      className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-sans text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                      disabled={isLoading}
                    />
                    <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 px-1">
                      <span>Minimum 5 characters.</span>
                      <span className="font-mono">{claim.length} / 500</span>
                    </div>
                  </div>

                  {/* Submission and Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || claim.trim().length < 5}
                      className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/10 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      <span>Investigate Claim</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadArchive}
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium rounded-xl border border-zinc-700 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Verified Run (Speed of Light)</span>
                    </button>
                  </div>
                </form>

                {/* Example Pills */}
                <div className="space-y-2 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                    Example Factual Claims:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "The speed of light in a vacuum is approximately 299,792 kilometers per second.",
                      "The Great Wall of China is visible from the Moon with the naked eye.",
                      "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => handleExampleSelect(example)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-left transition-colors"
                      >
                        &ldquo;{example}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Methodological Transparency Disclosures */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-400 pt-4">
                  <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="font-semibold text-zinc-200 block">1. Bidirectional Search</span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Retriever explores both confirmation and counter-evidence queries via Tavily.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="font-semibold text-zinc-200 block">2. Deterministic Audit</span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Every quotation is validated against raw passage substrings; hallucinations are rejected.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="font-semibold text-zinc-200 block">3. Contradiction Detection</span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Nemotron analyzes evidential tensions and enforces INSUFFICIENT_EVIDENCE when appropriate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Notifications */}
            {clientError && (
              <div className="max-w-3xl mx-auto p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm rounded-xl flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Validation Notice</strong>
                  <span>{clientError}</span>
                </div>
              </div>
            )}

            {apiError && (
              <div className="max-w-3xl mx-auto p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm rounded-xl flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-700/50 text-amber-200">
                      {apiError.code}
                    </span>
                    <strong className="font-semibold">Investigation Error</strong>
                  </div>
                  <p className="leading-relaxed">{apiError.message}</p>
                </div>
              </div>
            )}

            {/* In-Flight Progress Indicator */}
            {isLoading && (
              <div className="max-w-3xl mx-auto">
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
                    className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors"
                  >
                    <span>← New Investigation</span>
                  </button>

                  <span className="text-xs text-zinc-500 font-mono">
                    Pipeline v{currentReport.metadata.pipelineVersion}
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
              <div className="max-w-3xl mx-auto p-12 text-center">
                <p className="text-sm text-zinc-400">Loading verified live investigation run...</p>
              </div>
            ) : currentReport ? (
              <EvidenceReportView report={currentReport} archiveBadge={true} />
            ) : (
              <div className="max-w-2xl mx-auto text-center p-8 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-4">
                <Info className="w-8 h-8 text-blue-400 mx-auto" />
                <h3 className="text-base font-semibold text-zinc-200">Verified Run Archive</h3>
                <p className="text-xs text-zinc-400">
                  Inspect genuine output from the Speed of Light live investigation executed on October 30, 2026.
                </p>
                <button
                  onClick={handleLoadArchive}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
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

      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>EvidenceCheck AI • Citation-audited fact verification platform</p>
          <p className="text-[11px] text-zinc-600">
            Powered by NVIDIA Nemotron & Tavily Search • Zero fabricated verdicts
          </p>
        </div>
      </footer>
    </div>
  );
}
