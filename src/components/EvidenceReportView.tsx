"use client";

import React, { useState } from "react";
import type { EvidenceReport, PassageStance } from "@/lib/schemas/report";
import { InteractiveEvidenceTrail } from "./InteractiveEvidenceTrail";
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
  Sparkles,
} from "lucide-react";

interface ReportViewProps {
  report: EvidenceReport;
  archiveBadge?: boolean;
}

export function EvidenceReportView({ report, archiveBadge = false }: ReportViewProps) {
  const [selectedStanceFilter, setSelectedStanceFilter] = useState<PassageStance | "ALL">("ALL");
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const { verdict, claim, sources, passages, citations, contradictions, metadata } = report;

  // Verdict style mapping
  const getVerdictBadge = () => {
    switch (verdict.status) {
      case "SUPPORTED":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          label: "SUPPORTED",
          accentBorder: "border-emerald-500/40",
          glowColor: "rgba(16, 185, 129, 0.2)",
        };
      case "REFUTED":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          icon: <XCircle className="w-6 h-6 text-rose-400" />,
          label: "REFUTED",
          accentBorder: "border-rose-500/40",
          glowColor: "rgba(244, 63, 94, 0.2)",
        };
      case "CONTRADICTORY":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          label: "CONTRADICTORY",
          accentBorder: "border-amber-500/40",
          glowColor: "rgba(245, 158, 11, 0.2)",
        };
      case "INSUFFICIENT_EVIDENCE":
      default:
        return {
          bg: "bg-zinc-500/10 border-zinc-500/30 text-zinc-300",
          icon: <HelpCircle className="w-6 h-6 text-zinc-400" />,
          label: "INSUFFICIENT EVIDENCE",
          accentBorder: "border-zinc-500/40",
          glowColor: "rgba(148, 163, 184, 0.15)",
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
  const passagesMap = new Map(passages.map((p) => [p.id, p]));

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      {/* Archive / Provenance Banner if viewing verified live report */}
      {archiveBadge && (
        <div className="bg-[#111B2A]/90 border border-[#23C9C5]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#23C9C5]/10 border border-[#23C9C5]/30 flex items-center justify-center text-[#23C9C5] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-zinc-100 block font-semibold text-sm">
                Authentic Verified Investigation Archive
              </strong>
              <span className="text-zinc-400 text-xs">
                Executed live on{" "}
                <time dateTime={metadata.createdAt} className="font-mono text-[#23C9C5]">
                  {new Date(metadata.createdAt).toLocaleString()}
                </time>
                . Unmodified factual evidence benchmark.
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] bg-[#192739] text-[#23C9C5] px-3 py-1 rounded-full border border-[#23C9C5]/30 font-medium">
            {metadata.modelUsed}
          </span>
        </div>
      )}

      {/* Cinematic Verdict Showcase */}
      <section
        style={{ boxShadow: `0 0 40px ${verdictMeta.glowColor}` }}
        className={`bg-[#111B2A]/95 border ${verdictMeta.accentBorder} rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all`}
      >
        <div className="space-y-6">
          {/* Top metadata pill */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex items-center space-x-2.5 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wide ${verdictMeta.bg}`}>
              {verdictMeta.icon}
              <span className="text-sm">{verdictMeta.label}</span>
            </div>

            <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
              <span className="text-zinc-400">ID: {report.id}</span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-[#23C9C5]" />
                <time dateTime={metadata.createdAt}>
                  {new Date(metadata.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </span>
            </div>
          </div>

          {/* Original Factual Claim */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#23C9C5] mb-2 flex items-center space-x-1.5">
              <span>Audited Factual Assertion</span>
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-snug tracking-tight">
              &ldquo;{claim.rawText}&rdquo;
            </p>
          </div>

          {/* Verdict Synthesis & Support Index */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left 8 cols: Synthesis & Reasoning */}
            <div className="lg:col-span-8 bg-[#080D16]/80 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5">
                  Evidential Synthesis
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                  {verdict.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-1.5">
                <span className="font-bold text-zinc-300">Forensic Reasoning:</span>
                <p className="leading-relaxed font-sans">{verdict.reasoning}</p>
              </div>
            </div>

            {/* Right 4 cols: Support Index Meter */}
            <div className="lg:col-span-4 bg-[#080D16]/80 border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Heuristic Support Index
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold font-mono text-[#23C9C5]">
                    {verdict.confidence.toFixed(2)}
                  </span>
                  <span className="text-sm font-mono text-zinc-500">/ 1.00</span>
                </div>
                {/* Progress bar visual */}
                <div className="w-full bg-zinc-900 h-2 rounded-full mt-3 overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-[#23C9C5] to-[#10B981] rounded-full transition-all duration-1000"
                    style={{ width: `${verdict.confidence * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 italic leading-relaxed pt-3 border-t border-zinc-800/80">
                {verdict.confidenceInterpretation}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SIGNATURE EVIDENCE TRAIL (PHASE D) */}
      <section className="bg-[#111B2A]/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <InteractiveEvidenceTrail report={report} />
      </section>

      {/* Verified Evidence Trail & Quotation Audit Cards */}
      <section className="bg-[#111B2A]/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-[#23C9C5]" />
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                Deterministic Citation Audit Trail
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Every sentence assertion is programmatically verified against authentic search snippets.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              {verifiedCitations.length} Verified
            </span>
            {failedCitations.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                {failedCitations.length} Rejected
              </span>
            )}
            {unverifiedCitations.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold">
                {unverifiedCitations.length} Unverified
              </span>
            )}
          </div>
        </div>

        {/* Audit Scope Disclosure */}
        <div className="text-xs text-zinc-300 bg-[#080D16]/80 p-3.5 rounded-xl border border-zinc-800/80 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-[#23C9C5] shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>Audit Scope Disclosure:</strong> Citations are labeled as verified against{" "}
            <code className="text-[#23C9C5] bg-[#192739] px-1.5 py-0.5 rounded font-mono text-[11px]">
              SEARCH_SNIPPET
            </code>
            . Deterministic validation guarantees the quote exists verbatim in the retrieved search snippet; full original webpage DOM verification is not claimed.
          </span>
        </div>

        {/* Citation Cards */}
        <div className="space-y-4">
          {citations.map((c, idx) => {
            const isVerified = c.validationStatus === "VERIFIED";
            const isFailed = c.validationStatus === "FAILED";
            const source = sourcesMap.get(c.sourceId);
            const passage = passagesMap.get(c.passageId);
            const isExpanded = expandedCitationId === c.id;

            return (
              <div
                key={c.id || idx}
                className={`p-5 rounded-2xl border transition-all ${
                  isVerified
                    ? "bg-[#080D16]/90 border-emerald-500/30 hover:border-emerald-500/50"
                    : isFailed
                    ? "bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50"
                    : "bg-[#080D16]/90 border-zinc-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        Citation #{idx + 1}
                      </span>
                      {isVerified && (
                        <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>VERIFIED AGAINST SNIPPET</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center space-x-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>QUOTE AUDIT REJECTED</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        Passage: {c.passageId}
                      </span>
                      {source && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[#23C9C5] font-mono text-[11px]">
                            {source.domain}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Assertion Sentence */}
                  <p className="text-base font-semibold text-zinc-100 leading-snug">
                    &ldquo;{c.sentence}&rdquo;
                  </p>

                  {/* Quoted Text */}
                  {c.exactQuote && (
                    <div className="text-xs p-3.5 rounded-xl bg-[#111B2A] border border-zinc-800 font-mono text-zinc-200">
                      <span className="text-[#23C9C5] block text-[10px] uppercase font-sans font-bold mb-1">
                        Exact Quoted Substring:
                      </span>
                      &ldquo;{c.exactQuote}&rdquo;
                    </div>
                  )}

                  {/* Rejection Diagnostics */}
                  {isFailed && (
                    <div className="text-xs text-rose-300 bg-rose-950/20 p-3 rounded-xl border border-rose-900/40 leading-relaxed">
                      <strong>Audit Rejection Reason:</strong> The quoted text contained formatting artifacts (such as ellipses or paraphrasing) that did not exist as a contiguous verbatim substring in the passage text.
                    </div>
                  )}

                  {/* Expand full passage drawer */}
                  {passage && (
                    <div className="pt-2">
                      <button
                        onClick={() => setExpandedCitationId(isExpanded ? null : c.id)}
                        className="text-xs text-[#23C9C5] hover:text-[#1db3af] inline-flex items-center space-x-1 font-medium transition-colors"
                      >
                        <span>{isExpanded ? "Hide Source Passage Context" : "View Source Passage Context"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-[#111B2A] border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed font-sans">
                          <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                            Passage {passage.id} [Offsets: {passage.charOffsetStart ?? 0}–{passage.charOffsetEnd ?? 0}]:
                          </span>
                          {passage.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contradiction Analysis */}
      <section className="bg-[#111B2A]/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-800">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
            Contradiction & Tension Analysis
          </h3>
        </div>

        {contradictions.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#080D16]/80 border border-zinc-800 text-xs text-zinc-300 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Zero Contradictions Detected:</strong> All substantive passages and reported values across supporting and challenging retrieval queries were factually congruent.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {contradictions.map((con) => (
              <div
                key={con.id}
                className="p-4 rounded-xl bg-amber-950/15 border border-amber-500/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 uppercase tracking-wide">
                    [{con.severity}] Evidential Contradiction
                  </span>
                  <span className="text-zinc-400 font-mono">{con.id}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed">{con.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Authentic Source Cards Grid */}
      <section className="bg-[#111B2A]/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 flex items-center space-x-2.5 tracking-tight">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>Authentic Sources ({sources.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              External web sources retrieved via dual Tavily searches.
            </p>
          </div>
        </div>

        {/* Source Non-Independence Disclaimer */}
        <div className="text-[11px] text-zinc-400 bg-[#080D16]/80 p-3 rounded-xl border border-zinc-800/80">
          <strong>Source Independence Disclosure:</strong> Sources reflect returned web search results; independent editorial verification or ownership independence of third-party domains is not claimed.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sources.map((src) => (
            <div
              key={src.id}
              className="p-5 rounded-2xl bg-[#080D16]/90 border border-zinc-800 space-y-3.5 flex flex-col justify-between hover:border-[#23C9C5]/40 transition-all hover:shadow-lg hover:shadow-[#23C9C5]/5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#192739] border border-zinc-700 text-[#23C9C5] font-bold">
                    {src.id}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">
                    {src.domain}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug">
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
                  className="inline-flex items-center space-x-1.5 text-xs text-[#23C9C5] hover:text-[#1db3af] hover:underline font-semibold"
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
      <section className="bg-[#111B2A]/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 flex items-center space-x-2.5 tracking-tight">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Atomic Evidence Passages ({passages.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Indexed text fragments extracted with character offset boundaries.
            </p>
          </div>

          {/* Stance Filter Tabs */}
          <div className="flex items-center space-x-1 bg-[#080D16] p-1 rounded-xl border border-zinc-800 text-xs">
            {(["ALL", "SUPPORTING", "CONTRADICTING", "NEUTRAL"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedStanceFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedStanceFilter === filter
                    ? "bg-[#192739] text-[#23C9C5] shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Model Stance Disclaimer */}
        <div className="text-[11px] text-zinc-400 bg-[#080D16]/80 p-3 rounded-xl border border-zinc-800/80">
          <strong>Passage Stance Disclosure:</strong> Stances are model-classified by Nemotron; only citations marked <span className="text-emerald-400 font-semibold">VERIFIED</span> have been audited deterministically against verbatim text.
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredPassages.map((psg) => (
            <div
              key={psg.id}
              className="p-4 rounded-xl bg-[#080D16]/80 border border-zinc-800/80 text-xs space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-[#23C9C5]">{psg.id}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
          ))}
        </div>
      </section>

      {/* Raw JSON Audit Inspector */}
      <section className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#080D16]/60">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-[#111B2A]/50 transition-colors"
        >
          <span className="flex items-center space-x-2 font-mono">
            <span>Audit Trail & Raw Evidence Report (JSON)</span>
          </span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <div className="p-5 border-t border-zinc-800 bg-[#080D16]">
            <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-96 p-4 bg-[#111B2A] rounded-xl border border-zinc-800">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
