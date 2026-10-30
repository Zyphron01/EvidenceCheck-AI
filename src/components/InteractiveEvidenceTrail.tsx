"use client";

import React, { useState, useMemo } from "react";
import type { EvidenceReport } from "@/lib/schemas/report";
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface EvidenceTrailProps {
  report: EvidenceReport;
}

type SelectedNodeType =
  | { type: "CLAIM"; id: string }
  | { type: "SOURCE"; id: string }
  | { type: "PASSAGE"; id: string }
  | { type: "CITATION"; id: string }
  | { type: "VERDICT"; id: string }
  | null;

export function InteractiveEvidenceTrail({ report }: EvidenceTrailProps) {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeType>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { claim, sources, passages, citations, contradictions, verdict } = report;

  // Build relationship lookups using authentic IDs
  const sourceMap = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const passageMap = useMemo(() => new Map(passages.map((p) => [p.id, p])), [passages]);
  const citationMap = useMemo(() => new Map(citations.map((c) => [c.id, c])), [citations]);

  // Map passage to its source
  const passageToSource = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of passages) {
      map.set(p.id, p.sourceId);
    }
    return map;
  }, [passages]);

  // Map citation to passage and source
  const citationToPassage = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of citations) {
      map.set(c.id, c.passageId);
    }
    return map;
  }, [citations]);

  // Calculate active highlighted nodes based on selection or hover
  const activeHighlightedSet = useMemo(() => {
    const set = new Set<string>();
    const focusId = selectedNode?.id || hoveredNodeId;
    if (!focusId) return set;

    set.add(focusId);

    // If source selected
    if (sourceMap.has(focusId)) {
      for (const p of passages) {
        if (p.sourceId === focusId) {
          set.add(p.id);
          for (const c of citations) {
            if (c.passageId === p.id) {
              set.add(c.id);
            }
          }
        }
      }
    }

    // If passage selected
    if (passageMap.has(focusId)) {
      const srcId = passageToSource.get(focusId);
      if (srcId) set.add(srcId);
      for (const c of citations) {
        if (c.passageId === focusId) {
          set.add(c.id);
        }
      }
    }

    // If citation selected
    if (citationMap.has(focusId)) {
      const psgId = citationToPassage.get(focusId);
      if (psgId) {
        set.add(psgId);
        const srcId = passageToSource.get(psgId);
        if (srcId) set.add(srcId);
      }
    }

    return set;
  }, [selectedNode, hoveredNodeId, sourceMap, passageMap, citationMap, passages, citations, passageToSource, citationToPassage]);

  // Get active selected node metadata for the detail inspector
  const detailData = useMemo(() => {
    if (!selectedNode) return null;
    switch (selectedNode.type) {
      case "CLAIM":
        return {
          title: "Claim Root Node",
          badge: "Factual Assertion",
          badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          content: claim.rawText,
          meta: `Submitted: ${new Date(claim.submittedAt).toLocaleTimeString()}`,
        };
      case "SOURCE": {
        const s = sourceMap.get(selectedNode.id);
        if (!s) return null;
        return {
          title: `Source: ${s.id}`,
          badge: s.domain,
          badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          heading: s.title,
          domain: s.domain,
          url: s.url,
          content: s.snippet || "Full snippet available via passages.",
          meta: `Retrieved: ${new Date(s.retrievedAt).toLocaleDateString()}`,
        };
      }
      case "PASSAGE": {
        const p = passageMap.get(selectedNode.id);
        if (!p) return null;
        const parentSource = sourceMap.get(p.sourceId);
        return {
          title: `Passage: ${p.id}`,
          badge: p.stance,
          badgeColor:
            p.stance === "SUPPORTING"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : p.stance === "CONTRADICTING"
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : "bg-zinc-800 text-zinc-400 border-zinc-700",
          heading: parentSource ? `From: ${parentSource.title}` : undefined,
          domain: parentSource?.domain,
          content: p.text,
          meta: `Character Offsets: [${p.charOffsetStart ?? 0} — ${p.charOffsetEnd ?? 0}]`,
        };
      }
      case "CITATION": {
        const c = citationMap.get(selectedNode.id);
        if (!c) return null;
        const parentPassage = passageMap.get(c.passageId);
        return {
          title: `Citation Audit: ${c.id}`,
          badge: c.validationStatus,
          badgeColor:
            c.validationStatus === "VERIFIED"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20",
          heading: `Assertion: "${c.sentence}"`,
          exactQuote: c.exactQuote,
          content: parentPassage?.text,
          meta: `Scope: ${c.verificationScope} • Target: ${c.passageId}`,
          failureReason:
            c.validationStatus === "FAILED"
              ? "The quoted text could not be verified as an unbroken verbatim substring in the passage text."
              : undefined,
        };
      }
      case "VERDICT":
        return {
          title: "Verdict Node",
          badge: verdict.status,
          badgeColor:
            verdict.status === "SUPPORTED"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : verdict.status === "REFUTED"
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20",
          heading: `Support Index: ${verdict.confidence.toFixed(2)} / 1.00`,
          content: verdict.summary,
          meta: verdict.confidenceInterpretation,
        };
      default:
        return null;
    }
  }, [selectedNode, claim, sourceMap, passageMap, citationMap, verdict]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#23C9C5]" />
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
              Interactive Evidence Constellation
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#23C9C5]/10 text-[#23C9C5] border border-[#23C9C5]/30">
              Deterministic Graph
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Explore authentic evidence trajectories: Claim → Sources → Atomic Passages → Audited Citations → Verdict.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors border border-zinc-700"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Focus</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-zinc-500">
            {sources.length} Sources • {passages.length} Passages • {citations.length} Citations
          </span>
        </div>
      </div>

      {/* Main 2.5D Graph Canvas View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: The 4-Column Evidence Flow */}
        <div className="lg:col-span-8 bg-[#0B1320]/90 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl overflow-x-auto min-h-[500px]">
          <div className="grid grid-cols-4 gap-4 min-w-[680px]">
            {/* COLUMN 1: SOURCES */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5 pb-2 border-b border-zinc-800/80">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>1. Sources ({sources.length})</span>
              </div>
              <div className="space-y-2.5">
                {sources.map((src) => {
                  const isSelected = selectedNode?.id === src.id;
                  const isHighlighted = activeHighlightedSet.has(src.id);
                  const isDimmed = activeHighlightedSet.size > 0 && !isHighlighted;

                  return (
                    <div
                      key={src.id}
                      onClick={() => setSelectedNode({ type: "SOURCE", id: src.id })}
                      onMouseEnter={() => setHoveredNodeId(src.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? "bg-[#192739] border-[#23C9C5] shadow-lg shadow-[#23C9C5]/10 scale-[1.02]"
                          : isHighlighted
                          ? "bg-[#142032] border-[#23C9C5]/60"
                          : isDimmed
                          ? "bg-zinc-950/40 border-zinc-800/40 opacity-40"
                          : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                        <span className="font-bold text-zinc-300">{src.id}</span>
                        <span className="truncate max-w-[80px]">{src.domain}</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug">
                        {src.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: ATOMIC PASSAGES */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5 pb-2 border-b border-zinc-800/80">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>2. Passages ({passages.length})</span>
              </div>
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {passages.map((psg) => {
                  const isSelected = selectedNode?.id === psg.id;
                  const isHighlighted = activeHighlightedSet.has(psg.id);
                  const isDimmed = activeHighlightedSet.size > 0 && !isHighlighted;

                  return (
                    <div
                      key={psg.id}
                      onClick={() => setSelectedNode({ type: "PASSAGE", id: psg.id })}
                      onMouseEnter={() => setHoveredNodeId(psg.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all border text-left text-xs ${
                        isSelected
                          ? "bg-[#192739] border-[#23C9C5] shadow-md shadow-[#23C9C5]/10 scale-[1.02]"
                          : isHighlighted
                          ? "bg-[#142032] border-[#23C9C5]/60"
                          : isDimmed
                          ? "bg-zinc-950/40 border-zinc-800/40 opacity-40"
                          : "bg-zinc-950/60 border-zinc-800/70 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-zinc-300 text-[10px]">
                          {psg.id}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            psg.stance === "SUPPORTING"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : psg.stance === "CONTRADICTING"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {psg.stance.slice(0, 4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                        {psg.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: AUDITED CITATIONS */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5 pb-2 border-b border-zinc-800/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Citations ({citations.length})</span>
              </div>
              <div className="space-y-2.5">
                {citations.map((cit) => {
                  const isSelected = selectedNode?.id === cit.id;
                  const isHighlighted = activeHighlightedSet.has(cit.id);
                  const isDimmed = activeHighlightedSet.size > 0 && !isHighlighted;
                  const isVerified = cit.validationStatus === "VERIFIED";

                  return (
                    <div
                      key={cit.id}
                      onClick={() => setSelectedNode({ type: "CITATION", id: cit.id })}
                      onMouseEnter={() => setHoveredNodeId(cit.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? "bg-[#192739] border-[#23C9C5] shadow-lg shadow-[#23C9C5]/10 scale-[1.02]"
                          : isHighlighted
                          ? "bg-[#142032] border-[#23C9C5]/60"
                          : isDimmed
                          ? "bg-zinc-950/40 border-zinc-800/40 opacity-40"
                          : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] font-bold text-zinc-300">
                          {cit.id}
                        </span>
                        {isVerified ? (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-2 italic">
                        &ldquo;{cit.sentence}&rdquo;
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        Target: {cit.passageId}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 4: VERDICT OUTCOME */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5 pb-2 border-b border-zinc-800/80">
                <Sparkles className="w-3.5 h-3.5 text-[#23C9C5]" />
                <span>4. Synthesis Verdict</span>
              </div>
              <div
                onClick={() => setSelectedNode({ type: "VERDICT", id: "verdict-root" })}
                className={`p-4 rounded-xl cursor-pointer transition-all border text-left ${
                  selectedNode?.type === "VERDICT"
                    ? "bg-[#192739] border-[#23C9C5] shadow-lg shadow-[#23C9C5]/10 scale-[1.02]"
                    : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wide">
                    {verdict.status}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100 mb-1">
                  {verdict.confidence.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-zinc-400">/ 1.00</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                  {verdict.summary}
                </p>
              </div>

              {/* Contradiction indicator if contradictions exist */}
              {contradictions.length > 0 ? (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Contradictions: {contradictions.length}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Tension arcs active in evidence trail.</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Zero Contradictions Found</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Selected Node Forensic Inspector */}
        <div className="lg:col-span-4 bg-[#111B2A] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#23C9C5]" />
              <span>Evidence Inspector</span>
            </h4>
            {detailData && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${detailData.badgeColor}`}>
                {detailData.badge}
              </span>
            )}
          </div>

          {detailData ? (
            <div className="space-y-3.5 text-left text-xs">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide block mb-0.5">
                  {detailData.title}
                </span>
                {detailData.heading && (
                  <h5 className="text-sm font-semibold text-zinc-100 leading-snug mb-1">
                    {detailData.heading}
                  </h5>
                )}
                {detailData.domain && (
                  <span className="text-xs font-mono text-[#23C9C5]">
                    {detailData.domain}
                  </span>
                )}
              </div>

              {/* Exact Quote Inspection if citation */}
              {detailData.exactQuote && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
                  <span className="text-zinc-500 block text-[9px] uppercase font-sans font-bold">
                    Audited Quote Substring:
                  </span>
                  <p>&ldquo;{detailData.exactQuote}&rdquo;</p>
                </div>
              )}

              {/* Failure reason explanation if failed */}
              {detailData.failureReason && (
                <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                  <strong>Audit Rejection:</strong> {detailData.failureReason}
                </div>
              )}

              {/* Full Content Preview */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">
                  Retrieved Text / Synthesis:
                </span>
                <p className="text-zinc-300 leading-relaxed max-h-48 overflow-y-auto p-2.5 rounded bg-zinc-950/70 border border-zinc-800/80">
                  {detailData.content}
                </p>
              </div>

              {/* External URL action if Source */}
              {detailData.url && (
                <div className="pt-2">
                  <a
                    href={detailData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#23C9C5] hover:bg-[#1db3af] text-zinc-950 text-xs font-bold transition-colors shadow-md"
                  >
                    <span>Open Authentic Webpage</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
                {detailData.meta}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-2 text-zinc-500">
              <HelpCircle className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">Click any node in the evidence flow to inspect verbatim snippets, source metadata, and quote audit proof.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
