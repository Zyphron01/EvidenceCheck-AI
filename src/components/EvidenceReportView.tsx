"use client";

import React, { useState } from "react";
import type { EvidenceReport, PassageStance } from "@/lib/schemas/report";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReportViewProps {
  report: EvidenceReport;
  archiveBadge?: boolean;
}

export function EvidenceReportView({ report, archiveBadge = false }: ReportViewProps) {
  const [selectedStanceFilter, setSelectedStanceFilter] = useState<PassageStance | "ALL">("ALL");
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const { verdict, claim, sources, passages, citations, contradictions, metadata } = report;

  // Verdict style mapping
  const getVerdictBadge = () => {
    switch (verdict.status) {
      case "SUPPORTED":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          label: "SUPPORTED",
          accentBorder: "border-l-emerald-500",
        };
      case "REFUTED":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          label: "REFUTED",
          accentBorder: "border-l-rose-500",
        };
      case "CONTRADICTORY":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: "CONTRADICTORY",
          accentBorder: "border-l-amber-500",
        };
      case "INSUFFICIENT_EVIDENCE":
      default:
        return {
          bg: "bg-zinc-500/10 border-zinc-500/30 text-zinc-300",
          icon: <HelpCircle className="w-5 h-5 text-zinc-400" />,
          label: "INSUFFICIENT EVIDENCE",
          accentBorder: "border-l-zinc-500",
        };
    }
  };

  const verdictMeta = getVerdictBadge();

  const filteredPassages = passages.filter((p) => {
    if (selectedStanceFilter === "ALL") return true;
    return p.stance === selectedStanceFilter;
  });

  const verifiedCitations = citations.filter((c) => c.validationStatus === "VERIFIED");
  const failedCitations = citations.filter((c) => c.validationStatus === "FAILED");
  const unverifiedCitations = citations.filter((c) => c.validationStatus === "UNVERIFIED");

  const sourcesMap = new Map(sources.map((s) => [s.id, s]));

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Archive / Provenance Banner if viewing verified live report */}
      {archiveBadge && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Verified Live Archive Run:</strong> Executed and recorded on{" "}
              <time dateTime={metadata.createdAt} className="font-mono text-zinc-200">
                {new Date(metadata.createdAt).toLocaleString()}
              </time>
              . Output is authentic data from Phase 2.5 testing.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/50">
            {metadata.modelUsed}
          </span>
        </div>
      )}

      {/* Claim & Verdict Card */}
      <section
        className={`bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-2xl border-l-4 ${verdictMeta.accentBorder}`}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-semibold ${verdictMeta.bg}`}>
              {verdictMeta.icon}
              <span>{verdictMeta.label}</span>
            </div>

            <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
              <span title="Report ID">{report.id}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <time dateTime={metadata.createdAt}>
                  {new Date(metadata.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Factual Claim Investigated
            </h2>
            <p className="text-xl sm:text-2xl font-semibold text-zinc-100 leading-snug">
              &ldquo;{claim.rawText}&rdquo;
            </p>
          </div>

          {/* Verdict Synthesis */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-5 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1">
                Evidence Synthesis
              </h3>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {verdict.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300">Evidential Reasoning:</span>
              <p className="leading-relaxed">{verdict.reasoning}</p>
            </div>

            {/* Heuristic Support Index Disclosures */}
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 font-medium">Support Index:</span>
                <span className="font-mono text-zinc-100 font-bold text-sm">
                  {verdict.confidence.toFixed(2)} / 1.00
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 italic max-w-xl">
                {verdict.confidenceInterpretation}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Evidence Trail & Citation Audit (Locked Innovation) */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-zinc-100">
                Verified Evidence Trail & Citation Audit
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every analytical sentence is audited for exact substring match against retrieved snippets.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {verifiedCitations.length} Verified
            </span>
            {failedCitations.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                {failedCitations.length} Rejected
              </span>
            )}
            {unverifiedCitations.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                {unverifiedCitations.length} Unverified
              </span>
            )}
          </div>
        </div>

        {/* Verification Scope Notice */}
        <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 flex items-start space-x-2">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            <strong>Audit Scope Disclosure:</strong> Citations are labeled as verified against{" "}
            <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-[10px]">SEARCH_SNIPPET</code>.
            Verification confirms that the quoted string exists verbatim in the search engine snippet; it does not claim full original webpage DOM verification.
          </span>
        </div>

        {/* Citations List */}
        <div className="space-y-4">
          {citations.map((c, idx) => {
            const isVerified = c.validationStatus === "VERIFIED";
            const isFailed = c.validationStatus === "FAILED";
            const source = sourcesMap.get(c.sourceId);

            return (
              <div
                key={c.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  isVerified
                    ? "bg-zinc-950/80 border-emerald-500/30 hover:border-emerald-500/50"
                    : isFailed
                    ? "bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50"
                    : "bg-zinc-950/80 border-zinc-800"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-zinc-400">
                        #{idx + 1}
                      </span>
                      {isVerified && (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED AGAINST SNIPPET</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          <span>QUOTE AUDIT FAILED</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        onClick={() => setHighlightedPassageId(c.passageId)}
                        className="text-xs font-mono text-blue-400 hover:text-blue-300 underline"
                      >
                        Passage: {c.passageId}
                      </button>
                      {source && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {source.domain}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Assertion Sentence */}
                  <p className="text-sm font-medium text-zinc-200">
                    &ldquo;{c.sentence}&rdquo;
                  </p>

                  {/* Quoted Text */}
                  {c.exactQuote && (
                    <div className="text-xs p-2.5 rounded bg-zinc-900/90 border border-zinc-800 font-mono text-zinc-300">
                      <span className="text-zinc-500 block text-[10px] uppercase font-sans font-semibold mb-1">
                        Exact Quoted Substring:
                      </span>
                      &ldquo;{c.exactQuote}&rdquo;
                    </div>
                  )}

                  {/* Failure reason explanation if audit failed */}
                  {isFailed && (
                    <div className="text-xs text-rose-300/90 bg-rose-950/20 p-2 rounded border border-rose-900/30">
                      <strong>Audit Rejection Reason:</strong> The quoted text contained formatting artifacts (such as ellipses or paraphrasing) that did not exist as a contiguous verbatim substring in the passage text.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contradiction Analysis Section */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-zinc-100">
            Contradiction & Tension Analysis
          </h3>
        </div>

        {contradictions.length === 0 ? (
          <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Zero Contradictions Detected:</strong> All substantive passages and reported values across supporting and challenging retrieval queries were factually aligned.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {contradictions.map((con) => (
              <div
                key={con.id}
                className="p-4 rounded-lg bg-amber-950/10 border border-amber-500/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400 uppercase tracking-wide">
                    [{con.severity}] Contradiction
                  </span>
                  <span className="text-zinc-500 font-mono">{con.id}</span>
                </div>
                <p className="text-zinc-200">{con.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Authentic Source Cards Grid */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>Authentic Sources ({sources.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Original web pages retrieved via Tavily Basic Search.
            </p>
          </div>
        </div>

        {/* Source Non-Independence Disclaimer */}
        <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80">
          <strong>Source Independence Disclosure:</strong> Sources reflect returned web search results; independent editorial verification or ownership independence of third-party domains is not claimed.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sources.map((src) => (
            <div
              key={src.id}
              className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-semibold">
                    {src.id}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {src.domain}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-zinc-100 line-clamp-2">
                  {src.title}
                </h4>

                {src.snippet && (
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {src.snippet}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                >
                  <span>Open Authentic Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <time
                  dateTime={src.retrievedAt}
                  className="text-[10px] text-zinc-500 font-mono"
                  title="Retrieval Timestamp"
                >
                  {new Date(src.retrievedAt).toLocaleDateString()}
                </time>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Atomic Passages Explorer */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Atomic Passages ({passages.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Segmented text fragments extracted and indexed with character offset indices.
            </p>
          </div>

          {/* Stance Filter Tabs */}
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            {(["ALL", "SUPPORTING", "CONTRADICTING", "NEUTRAL"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedStanceFilter(filter)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  selectedStanceFilter === filter
                    ? "bg-zinc-800 text-zinc-100 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Model Stance Disclaimer */}
        <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80">
          <strong>Passage Classification Disclosure:</strong> Passage stances (Supporting / Contradicting / Neutral) are model-classified; only citations marked <span className="text-emerald-400 font-semibold">VERIFIED</span> have been deterministically audited against exact text.
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredPassages.map((psg) => {
            const isHighlighted = highlightedPassageId === psg.id;
            return (
              <div
                key={psg.id}
                id={`psg-${psg.id}`}
                className={`p-3.5 rounded-lg border transition-all text-xs space-y-2 ${
                  isHighlighted
                    ? "bg-blue-950/30 border-blue-500 shadow-lg shadow-blue-500/10"
                    : "bg-zinc-950/60 border-zinc-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-zinc-300">{psg.id}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        psg.stance === "SUPPORTING"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : psg.stance === "CONTRADICTING"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {psg.stance}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono">
                    Offset: {psg.charOffsetStart ?? 0}–{psg.charOffsetEnd ?? 0}
                  </span>
                </div>

                <p className="text-zinc-300 leading-relaxed font-sans">{psg.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Raw JSON Audit Inspector */}
      <section className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-6 py-3.5 flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
        >
          <span className="flex items-center space-x-2 font-mono">
            <span>Audit Trail & Raw Report Payload (JSON)</span>
          </span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950">
            <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-80 p-3 bg-zinc-900/60 rounded border border-zinc-800/80">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}

