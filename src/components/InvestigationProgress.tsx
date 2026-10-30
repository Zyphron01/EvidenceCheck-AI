"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Clock, ShieldCheck, Search, Cpu, Sparkles } from "lucide-react";

interface ProgressProps {
  claim: string;
  onCancel?: () => void;
}

export function InvestigationProgress({ claim, onCancel }: ProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#111B2A]/90 border border-[rgba(35,201,197,0.2)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#23C9C5]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Loader2 className="w-5 h-5 text-[#23C9C5] animate-spin" />
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              Evidence Engine Orchestrating Live Audit
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            Coordinating bidirectional search queries, passage segmentation, and 120B parameter reasoning.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#192739] text-xs font-mono text-[#23C9C5] border border-[#23C9C5]/30">
            <Clock className="w-3.5 h-3.5 text-[#23C9C5]" />
            <span>{elapsedSeconds}s elapsed</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-zinc-400 hover:text-rose-400 transition-colors px-2 py-1 underline font-medium"
            >
              Abort Investigation
            </button>
          )}
        </div>
      </div>

      {/* Target Claim Capsule */}
      <div className="bg-[#080D16]/80 border border-zinc-800/80 rounded-xl p-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#23C9C5] block mb-1 font-semibold flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>Factual Target Under Investigation</span>
        </span>
        <p className="text-sm text-zinc-100 font-medium italic leading-relaxed">
          &ldquo;{claim}&rdquo;
        </p>
      </div>

      {/* Active Pipeline Stages Description */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">Active Verification Pipeline</span>
          <span className="text-zinc-500 text-[11px] font-mono">
            Full end-to-end duration: ~25–40s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#080D16]/50 border border-zinc-800/80">
            <Cpu className="w-4 h-4 text-[#23C9C5] mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-200 block">1. Bidirectional Query Formulation</span>
              <span className="text-zinc-400 text-[11px] leading-relaxed">Nemotron formulates objective confirmation & adversarial counter-queries.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#080D16]/50 border border-zinc-800/80">
            <Search className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-200 block">2. Dual Retrieval & Normalization</span>
              <span className="text-zinc-400 text-[11px] leading-relaxed">Tavily executes dual queries; sources are deduplicated by canonical URL.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#080D16]/50 border border-zinc-800/80">
            <Cpu className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-200 block">3. Passage Synthesis & Stance Analysis</span>
              <span className="text-zinc-400 text-[11px] leading-relaxed">Snippets are isolated in untrusted XML containers for adversarial defense.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#080D16]/50 border border-zinc-800/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-200 block">4. Deterministic Citation Verification</span>
              <span className="text-zinc-400 text-[11px] leading-relaxed">Candidate quotations are audited for exact substring presence in source text.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-400 bg-[#080D16]/60 p-3 rounded-lg border border-zinc-800 flex items-center space-x-2.5">
        <span className="w-2 h-2 rounded-full bg-[#23C9C5] animate-ping" />
        <span>
          Investigation executing server-side. Do not reload or navigate away. Responses typically complete within 30–35 seconds.
        </span>
      </div>
    </div>
  );
}
