"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Clock, ShieldCheck, Search, Cpu } from "lucide-react";

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
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <h3 className="text-base font-semibold text-zinc-100">
              Investigation in Progress
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            Pipeline is executing across dual web search and 120B parameter inference.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs font-mono text-zinc-300 border border-zinc-700">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{elapsedSeconds}s elapsed</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline px-2 py-1"
            >
              Abort
            </button>
          )}
        </div>
      </div>

      {/* Target Claim Snapshot */}
      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3.5">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
          Investigating Claim
        </span>
        <p className="text-sm text-zinc-200 font-medium italic">
          &ldquo;{claim}&rdquo;
        </p>
      </div>

      {/* Transparent Pipeline Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium">Active Pipeline Phases</span>
          <span className="text-zinc-500 text-[11px]">
            Serverless dispatch (typical duration: 25–40s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
            <Cpu className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-zinc-200 block">1. Bidirectional Query Formulation</span>
              <span className="text-zinc-400 text-[11px]">Nemotron generates objective supporting and challenging queries.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
            <Search className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-zinc-200 block">2. Dual Retrieval & Deduplication</span>
              <span className="text-zinc-400 text-[11px]">Tavily retrieves authentic snippets with strict URL normalization.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
            <Cpu className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-zinc-200 block">3. Passage Synthesis & Stance Analysis</span>
              <span className="text-zinc-400 text-[11px]">Atomic passages classified under strict prompt-injection defenses.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-zinc-200 block">4. Deterministic Citation Audit</span>
              <span className="text-zinc-400 text-[11px]">Quotes strictly audited against retrieved snippets (no hallucinations).</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-500 bg-zinc-950/40 p-2.5 rounded border border-zinc-800/50 flex items-center space-x-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          Processing server-side. Do not refresh the page. Responses typically return in approximately 30–35 seconds.
        </span>
      </div>
    </div>
  );
}
